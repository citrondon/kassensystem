import { Capacitor } from "@capacitor/core";
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import { API_BASE } from "../services/api";

const APP_VERSION_KEY = "pos_app_version";
const BUILTIN_VERSION = "builtin";
const NATIVE_APK_VERSION = "1.0";

function getCurrentVersion(): string {
  return localStorage.getItem(APP_VERSION_KEY) || BUILTIN_VERSION;
}

function setCurrentVersion(version: string): void {
  localStorage.setItem(APP_VERSION_KEY, version);
}

function getStoreId(): string | null {
  try {
    const info = localStorage.getItem("pos_license_info");
    if (!info) return null;
    const parsed = JSON.parse(info);
    return parsed.storeId ? String(parsed.storeId) : null;
  } catch {
    return null;
  }
}

function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

interface VersionInfo {
  success: boolean;
  version: string;
  bundle: {
    version: string;
    checksum: string;
    url: string;
    size: number;
    minNativeVersion?: string;
  } | null;
}

/**
 * Check for OTA update and download if available.
 * Only runs in Capacitor (native), not in browser.
 * Returns true if an update was downloaded and will be applied on next start.
 */
export async function checkForOTAUpdate(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  try {
    const storeId = getStoreId();
    const url = storeId
      ? `${API_BASE}/app-version?storeId=${storeId}`
      : `${API_BASE}/app-version`;

    const res = await fetch(url);
    if (!res.ok) return false;

    const data: VersionInfo = await res.json();
    if (!data.success || !data.bundle) return false;

    const currentVersion = getCurrentVersion();
    if (data.version === currentVersion) return false;

    // Guard: skip if APK native version is below required minimum
    if (data.bundle.minNativeVersion) {
      if (compareSemver(NATIVE_APK_VERSION, data.bundle.minNativeVersion) < 0) {
        console.log(
          `[OTA] Skipping ${data.version}: requires APK >= ${data.bundle.minNativeVersion}, have ${NATIVE_APK_VERSION}`
        );
        return false;
      }
    }

    console.log(
      `[OTA] Update available: ${currentVersion} → ${data.version} (${data.bundle.size} bytes)`
    );

    // Download the bundle
    const bundleUrl = data.bundle.url.startsWith("http")
      ? data.bundle.url
      : `${API_BASE.replace(/\/api$/, "")}${data.bundle.url}`;

    const downloaded = await CapacitorUpdater.download({
      url: bundleUrl,
      version: data.version,
    });

    if (!downloaded) {
      console.error("[OTA] Download failed");
      return false;
    }

    // Set as next bundle
    await CapacitorUpdater.next({
      id: downloaded.id,
      version: data.version,
    });

    setCurrentVersion(data.version);
    console.log(`[OTA] Update ${data.version} staged for next launch`);

    return true;
  } catch (err) {
    console.error("[OTA] Update check failed:", err);
    return false;
  }
}

/**
 * Apply pending OTA update (reload the app into the new bundle).
 * Call this when user confirms restart.
 */
export async function applyOTAUpdate(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await CapacitorUpdater.reload();
  } catch (err) {
    console.error("[OTA] Reload failed:", err);
  }
}

/**
 * Get current app version info for display.
 */
export function getAppVersionInfo(): { version: string; isBuiltin: boolean } {
  const version = getCurrentVersion();
  return { version, isBuiltin: version === BUILTIN_VERSION };
}
