import { useState } from "react";
import { useLicense } from "../contexts/LicenseContext";
import { useI18n } from "../i18n/I18nContext";
import { KeyRound, Loader2, WifiOff, AlertCircle, Store } from "lucide-react";

export default function LicenseActivation() {
  const { state, info, activate, retry } = useLicense();
  const { t, lang } = useI18n();
  const [licenseKey, setLicenseKey] = useState("");
  const [storeName, setStoreName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const locale = lang === "fr" ? "fr-FR" : "de-DE";

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await activate(licenseKey.trim(), storeName.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("licenseActivationFailed"));
    } finally {
      setLoading(false);
    }
  }

  if (state === "offline-grace") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-slate-900">
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-amber-200 bg-amber-50 p-8 dark:border-amber-800 dark:bg-amber-900/30">
          <div className="flex items-center gap-3">
            <WifiOff className="h-8 w-8 text-amber-600" />
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t("offlineMode")}</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t("licenseOfflineMsg").replace("{date}", info ? new Date(info.expiresAt).toLocaleDateString(locale) : "?")}
              </p>
            </div>
          </div>
          <button onClick={retry} className="btn-primary w-full">{t("retry")}</button>
        </div>
      </div>
    );
  }

  if (state === "expired") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-slate-900">
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-red-200 bg-red-50 p-8 dark:border-red-800 dark:bg-red-900/30">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t("licenseExpired")}</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t("licenseExpiredMsg").replace("{date}", info ? new Date(info.expiresAt).toLocaleDateString(locale) : "?")}
              </p>
            </div>
          </div>
          <button onClick={retry} className="btn-primary w-full">{t("retry")}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-slate-900">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white">
            <Store className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t("posSystem")}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("licenseActivate")}</p>
        </div>

        <form onSubmit={handleActivate} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("licenseKey")}</label>
            <input
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-mono focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("storeName")}</label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder={t("storeName")}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-300">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary flex w-full items-center justify-center gap-2">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <KeyRound className="h-5 w-5" />}
            {t("licenseActivate")}
          </button>
        </form>
      </div>
    </div>
  );
}
