import { useEffect, useRef, useState } from "react";
import { useLicense } from "../contexts/LicenseContext";
import { useI18n } from "../i18n/I18nContext";
import { KeyRound, Loader2, WifiOff, AlertCircle, Store, Check, RotateCcw, ShieldCheck, FileText } from "lucide-react";
import { TermsDocument, TERMS_VERSION } from "./TermsDocument";

/**
 * Schritt-Anzeige für den Onboarding-Wizard (Schritt 1: Lizenz, Schritt 2: Konto).
 * Wird von LicenseActivation (Schritt 1) und SetupView (Schritt 2) verwendet,
 * damit der Übergang nach erfolgreicher Aktivierung wie ein Wizard wirkt.
 */
export function WizardSteps({ current }: { current: 1 | 2 }) {
  const { t } = useI18n();
  const steps = [t("wizardStepLicense"), t("wizardStepAccount")];
  return (
    <div className="flex items-center justify-center gap-2 text-xs">
      {steps.map((label, i) => {
        const n = (i + 1) as 1 | 2;
        const active = n === current;
        const done = n < current;
        return (
          <div key={n} className="flex items-center gap-2">
            {i > 0 && <div className="h-px w-6 bg-slate-300 dark:bg-slate-600" />}
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
                active
                  ? "bg-indigo-100 font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                  : done
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-slate-400 dark:text-slate-500"
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                  active
                    ? "bg-indigo-600 text-white"
                    : done
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                }`}
              >
                {done ? <Check className="h-3 w-3" /> : n}
              </span>
              {label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function LicenseActivation() {
  const { state, info, activate, retry, reset } = useLicense();
  const { t, lang } = useI18n();
  const [licenseKey, setLicenseKey] = useState("");
  const [storeName, setStoreName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // CGU: erst nach Scroll-Ans Ende + Akzeptieren wird Aktiviert
  const [scrolledEnd, setScrolledEnd] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const termsRef = useRef<HTMLDivElement>(null);
  const locale = lang === "fr" ? "fr-FR" : "de-DE";

  // Aktivierungs-Link: ?key=...&store=... aus der URL vorbelegen
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const key = params.get("key");
    const store = params.get("store");
    if (key) setLicenseKey(key);
    if (store) setStoreName(store);
  }, []);

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    if (!accepted || !scrolledEnd) {
      setError(t("termsAcceptRequired"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      await activate(licenseKey.trim(), storeName.trim(), TERMS_VERSION);
      // Key nach erfolgreicher Aktivierung aus der Adresszeile entfernen
      window.history.replaceState(null, "", window.location.pathname);
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
          <button onClick={reset} className="flex w-full items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            <RotateCcw className="h-3 w-3" />{t("licenseReset")}
          </button>
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
          <button onClick={reset} className="flex w-full items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            <RotateCcw className="h-3 w-3" />{t("licenseReset")}
          </button>
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
          <WizardSteps current={1} />
        </div>

        {/* CGU — zweistufig: erst Key+Laden, dann AGB */}

        {/* Stufe 1: Lizenz-Key + Laden-Name */}
        {!showTerms && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setShowTerms(true);
            }}
            className="space-y-4"
          >
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
            <button type="submit" className="btn-primary flex w-full items-center justify-center gap-2">
              <FileText className="h-5 w-5" />
              {t("termsContinue")}
            </button>
          </form>
        )}

        {/* Stufe 2: AGB durchlesen + akzeptieren + aktivieren */}
        {showTerms && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <FileText className="h-3.5 w-3.5" />
                {t("termsTitle")}
              </div>
              <div
                ref={termsRef}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  const atEnd = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
                  if (atEnd && !scrolledEnd) setScrolledEnd(true);
                }}
                className="max-h-[45vh] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 sm:max-h-96 dark:border-slate-700 dark:bg-slate-900/50"
              >
                <TermsDocument />
              </div>
              <p
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  scrolledEnd
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {scrolledEnd ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    {t("termsScrolledAll")}
                  </>
                ) : (
                  t("termsScrollHint")
                )}
              </p>
              <label
                className={`flex items-start gap-2.5 rounded-xl border p-3 text-sm transition-colors ${
                  accepted
                    ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20"
                    : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40"
                } ${!scrolledEnd ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
              >
                <input
                  type="checkbox"
                  checked={accepted}
                  disabled={!scrolledEnd}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700"
                />
                <span className="text-slate-700 dark:text-slate-300">{t("termsAccept")}</span>
              </label>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-300">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowTerms(false);
                  setAccepted(false);
                  setScrolledEnd(false);
                  setError("");
                }}
                className="btn-secondary flex items-center justify-center gap-1.5 px-4"
              >
                <RotateCcw className="h-4 w-4" />
                {t("termsBack")}
              </button>
              <button
                type="button"
                onClick={handleActivate}
                disabled={loading || !accepted || !scrolledEnd}
                className="btn-primary flex flex-1 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : accepted ? <ShieldCheck className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
                {t("licenseActivate")}
              </button>
            </div>
          </div>
        )}

        {info && (
          <button onClick={reset} className="flex w-full items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            <RotateCcw className="h-3 w-3" />{t("licenseReset")}
          </button>
        )}
      </div>
    </div>
  );
}
