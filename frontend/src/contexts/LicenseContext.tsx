import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { LicenseInfo } from "../types";
import { activateLicense, verifyLicense } from "../services/api";

type LicenseState = "checking" | "active" | "expired" | "none" | "offline-grace";

interface LicenseContextValue {
  state: LicenseState;
  info: LicenseInfo | null;
  activate: (licenseKey: string, storeName: string) => Promise<void>;
  retry: () => void;
  reset: () => void;
}

const LicenseContext = createContext<LicenseContextValue | null>(null);

const STORAGE_KEY = "pos_license_token";
const INFO_KEY = "pos_license_info";
const LICENSE_KEY_STORAGE = "pos_license_key";

// Generate a stable machine ID from browser fingerprint
function getMachineId(): string {
  const stored = localStorage.getItem("pos_machine_id");
  if (stored) return stored;

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
  const machineId = "m-" + Math.abs(hash).toString(16).padStart(8, "0");
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

    const machineId = getMachineId();
    try {
      const res = await verifyLicense(licenseKey, machineId);
      if (res.success && res.token) {
        localStorage.setItem(STORAGE_KEY, res.token);
        localStorage.setItem(INFO_KEY, JSON.stringify(res.license));
        setInfo(res.license);
        setState("active");
      } else {
        if (res.expired) {
          setState("expired");
        } else {
          checkGracePeriod(storedInfo);
        }
      }
    } catch {
      checkGracePeriod(storedInfo);
    }
  }

  function checkGracePeriod(storedInfo: string | null) {
    if (!storedInfo) {
      setState("none");
      return;
    }
    try {
      const parsed = JSON.parse(storedInfo) as LicenseInfo;
      const now = new Date();
      const expiresAt = new Date(parsed.expiresAt);

      if (expiresAt > now) {
        setInfo(parsed);
        setState("offline-grace");
      } else {
        setState("expired");
      }
    } catch {
      setState("none");
    }
  }

  useEffect(() => {
    checkLicense();
  }, []);

  async function activate(licenseKey: string, storeName: string) {
    const machineId = getMachineId();
    const res = await activateLicense(licenseKey, storeName, machineId);

    if (!res.success || !res.token) {
      throw new Error(res.error || "Aktivierung fehlgeschlagen");
    }

    localStorage.setItem(STORAGE_KEY, res.token);
    localStorage.setItem(INFO_KEY, JSON.stringify(res.license));
    localStorage.setItem(LICENSE_KEY_STORAGE, licenseKey);
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
