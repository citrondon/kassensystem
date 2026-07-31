import { Capacitor } from "@capacitor/core";
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import { API_BASE } from "../services/api";

const APP_VERSION_KEY = "pos_app_version";
const BUILTIN_VERSION = "builtin";

function getCurrentVersion(): string {
  return localStorage.getItem(APP_VERSION_KEY) || BUILTIN_VERSION;
}

function setCurrentVersion(version: string): void {
  localStorage.setItem(APP_VERSION_KEY, version);
}

interface VersionInfo {
  success: boolean;
  version: string;
  bundle: {
    version: string;
    checksum: string;
    url: string;
    size: number;
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
    const res = await fetch(`${API_BASE}/app-version`);
    if (!res.ok) return false;

    const data: VersionInfo = await res.json();
    if (!data.success || !data.bundle) return false;

    const currentVersion = getCurrentVersion();
    if (data.version === currentVersion) return false;

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
