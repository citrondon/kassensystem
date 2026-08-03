import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../i18n/I18nContext";
import { API_BASE } from "../services/api";
import LanguageSwitcher from "./LanguageSwitcher";
import { WizardSteps } from "./LicenseActivation";
import { Store, User, Lock, Loader2 } from "lucide-react";

export default function SetupView() {
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError(t("passwordMismatch"));
      return;
    }

    if (password.length < 10) {
      setError(t("passwordTooShort"));
      return;
    }

    setLoading(true);
    try {
      // storeId kommt serverseitig aus dem signierten Lizenz-Token
      const licenseToken = localStorage.getItem("pos_license_token");
      const res = await fetch(`${API_BASE}/auth/setup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(licenseToken ? { Authorization: `Bearer ${licenseToken}` } : {}),
        },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || t("setupFailed"));
        return;
      }

      localStorage.setItem("pos_auth_token", data.token);
      window.location.reload();
    } catch {
      setError(t("networkErrorSetup"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-slate-900">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg dark:bg-slate-800">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/40">
            <Store className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t("setupTitle")}</h1>
          <p className="text-slate-500 dark:text-slate-400">{t("setupSubtitle")}</p>
          <div className="mt-3">
            <WizardSteps current={2} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("username")}</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input id="setupUsername" name="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="input pl-10" required />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("password")}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input id="setupPassword" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input pl-10" required />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("confirmPassword")}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input id="setupConfirm" name="confirmPassword" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input pl-10" required />
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">{error}</div>
          )}

          <button type="submit" disabled={loading} className="btn-primary flex w-full items-center justify-center gap-2">
            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            {t("setupButton")}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-center gap-3">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
