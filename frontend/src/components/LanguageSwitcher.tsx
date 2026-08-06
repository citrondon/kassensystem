import { useI18n } from "../i18n/I18nContext";
import { Languages } from "lucide-react";

export default function LanguageSwitcher() {
  const { lang, toggleLang, t } = useI18n();

  return (
    <button
      onClick={toggleLang}
      title={t("language")}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
      aria-label={t("language")}
    >
      <Languages className="h-4 w-4" />
      <span className="uppercase tracking-wide">{lang === "fr" ? "FR" : "DE"}</span>
    </button>
  );
}
