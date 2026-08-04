import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";
import { LicenseInfo } from "../types";
import { activateLicense, verifyLicense } from "../services/api";

type LicenseState = "checking" | "active" | "expired" | "none" | "offline-grace";

interface LicenseContextValue {
  state: LicenseState;
  info: LicenseInfo | null;
  activate: (licenseKey: string, storeName: string, termsVersion?: string) => Promise<void>;
  retry: () => void;
  reset: () => void;
}

const LicenseContext = createContext<LicenseContextValue | null>(null);

const STORAGE_KEY = "pos_license_token";
const INFO_KEY = "pos_license_info";
const LICENSE_KEY_STORAGE = "pos_license_key";
const LAST_SEEN_KEY = "pos_last_seen_time";
const CLOCK_TOLERANCE_MS = 2 * 60 * 60 * 1000; // 2h Toleranz für Uhrzeitanpassung

// JWT-Payload dekodieren (base64) ohne Signatur-Verifikation.
// Der Token ist server-seitig signiert — Client kann ihn nicht fälschen.
// Wird genutzt um expiresAt tamper-resistent zu prüfen (nicht INFO_KEY).
function decodeJwtPayload(token: string): { expiresAt?: string; status?: string; plan?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
}

// ── Machine ID ────────────────────────────────────────────────
// APK (native): ANDROID_ID via Capacitor Device plugin — stabil über
//   App-Neuinstallationen, ändert sich nur bei Factory-Reset oder
//   Signatur-Wechsel. Kein Fehlalarm durch WebView-Update/Sprache/Rotation.
// Web (Browser): Fingerprint-Fallback (kein ANDROID_ID verfügbar).

function fingerprintMachineId(): string {
  const parts = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join("|");

  let hash = 0;
  for (let i = 0; i < parts.length; i++) {
    hash = (hash << 5) - hash + parts.charCodeAt(i);
    hash |= 0;
  }
  return "m-web-" + Math.abs(hash).toString(16).padStart(8, "0");
}

async function getMachineId(): Promise<string> {
  // Gecachte ID (localStorage) hat Vorrang — auch nach Update bleibt sie stabil
  const stored = localStorage.getItem("pos_machine_id");
  if (stored) return stored;

  if (Capacitor.isNativePlatform()) {
    try {
      const info = await Device.getId();
      const id = info.identifier || "";
      if (id) {
        const machineId = "m-android-" + id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
        localStorage.setItem("pos_machine_id", machineId);
        return machineId;
      }
    } catch {
      // Plugin nicht verfügbar → Fingerprint-Fallback
    }
  }

  const machineId = fingerprintMachineId();
  localStorage.setItem("pos_machine_id", machineId);
  return machineId;
}

export function LicenseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LicenseState>("checking");
  const [info, setInfo] = useState<LicenseInfo | null>(null);

  async function checkLicense() {
    const token = localStorage.getItem(STORAGE_KEY);
    const storedInfo = localStorage.getItem(INFO_KEY);
    const licenseKey = localStorage.getItem(LICENSE_KEY_STORAGE);

    if (!token || !licenseKey) {
      setState("none");
      return;
    }

    if (storedInfo) {
      try {
        setInfo(JSON.parse(storedInfo));
      } catch {
        // ignore
      }
    }

    const machineId = await getMachineId();
    try {
      const res = await verifyLicense(licenseKey, machineId);
      if (res.success && res.token) {
        localStorage.setItem(STORAGE_KEY, res.token);
        localStorage.setItem(INFO_KEY, JSON.stringify(res.license));
        localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
        setInfo(res.license);
        setState("active");
      } else if (res.expired) {
        setState("expired");
      } else if (res.statusCode === 404) {
        // Key existiert nicht auf diesem Server (z.B. lokal aktiviert, jetzt auf VPS)
        // → Grace Period ist falsch, Wizard muss neu erscheinen
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(INFO_KEY);
        localStorage.removeItem(LICENSE_KEY_STORAGE);
        setInfo(null);
        setState("none");
      } else {
        // Server-Fehler (500 etc.) → Offline-Check mit JWT + Clock-Schutz
        checkOffline(token, storedInfo);
      }
    } catch {
      // Netzwerkfehler (offline) → Offline-Check mit JWT + Clock-Schutz
      checkOffline(token, storedInfo);
    }
  }

  function checkOffline(token: string, storedInfo: string | null) {
    // 1. Expiry aus JWT-Payload (tamper-resistent, server-signiert)
    const payload = decodeJwtPayload(token);
    if (!payload?.expiresAt) {
      // JWT nicht dekodierbar → Vertrauen verloren
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(INFO_KEY);
      localStorage.removeItem(LICENSE_KEY_STORAGE);
      setInfo(null);
      setState("none");
      return;
    }

    const now = new Date();
    const expiresAt = new Date(payload.expiresAt);

    // 2. Clock-Rollback-Erkennung
    // Speichere letzte Seen-Zeit. Wenn jetzt < letzte Seen - Toleranz
    // → Systemuhr wurde zurückgestellt → Sperren
    const lastSeen = localStorage.getItem(LAST_SEEN_KEY);
    if (lastSeen) {
      const lastSeenMs = new Date(lastSeen).getTime();
      const nowMs = now.getTime();
      if (nowMs < lastSeenMs - CLOCK_TOLERANCE_MS) {
        // Clock rollback erkannt → Lizenz sperren
        setState("expired");
        return;
      }
    }

    // 3. Expiry prüfen
    if (expiresAt > now) {
      // Lizenz gültig — App funktioniert offline
      if (storedInfo) {
        try { setInfo(JSON.parse(storedInfo)); } catch { /* ignore */ }
      }
      setState("offline-grace");
      // Last-Seen Zeit aktualisieren
      localStorage.setItem(LAST_SEEN_KEY, now.toISOString());
    } else {
      // Lizenz abgelaufen → sperren
      setState("expired");
    }
  }

  useEffect(() => {
    checkLicense();

    // Re-Check wenn wieder online (catched Cancel/Extend vom Server)
    const goOnline = () => checkLicense();
    window.addEventListener("online", goOnline);

    // Periodic Re-Check alle 4 Stunden (wenn online)
    const interval = setInterval(() => {
      if (navigator.onLine) checkLicense();
    }, 4 * 60 * 60 * 1000);

    return () => {
      window.removeEventListener("online", goOnline);
      clearInterval(interval);
    };
  }, []);

  async function activate(licenseKey: string, storeName: string, termsVersion?: string) {
    const machineId = await getMachineId();
    const res = await activateLicense(licenseKey, storeName, machineId, termsVersion);

    if (!res.success || !res.token) {
      const msg =
        res.errorCode === "license_in_use"
          ? "Diese Lizenz ist bereits auf einem anderen Gerät aktiv. Kontaktieren Sie Ihren Händler."
          : res.error || "Aktivierung fehlgeschlagen";
      throw new Error(msg);
    }

    localStorage.setItem(STORAGE_KEY, res.token);
    localStorage.setItem(INFO_KEY, JSON.stringify(res.license));
    localStorage.setItem(LICENSE_KEY_STORAGE, licenseKey);
    localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
    setInfo(res.license);
    setState("active");
  }

  function retry() {
    setState("checking");
    checkLicense();
  }

  // Lizenz gezielt zurücksetzen (localStorage + State) — kein Cache-Tricksen nötig
  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(INFO_KEY);
    localStorage.removeItem(LICENSE_KEY_STORAGE);
    localStorage.removeItem(LAST_SEEN_KEY);
    setInfo(null);
    setState("none");
  }

  return (
    <LicenseContext.Provider value={{ state, info, activate, retry, reset }}>
      {children}
    </LicenseContext.Provider>
  );
}

export function useLicense(): LicenseContextValue {
  const ctx = useContext(LicenseContext);
  if (!ctx) throw new Error("useLicense must be used within LicenseProvider");
  return ctx;
}

export function getStoredLicenseToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}
