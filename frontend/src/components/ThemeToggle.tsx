import { useTheme } from "../contexts/ThemeContext";
import { useI18n } from "../i18n/I18nContext";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { t } = useI18n();

  return (
    <button
      onClick={toggle}
      className="btn-icon"
      title={theme === "light" ? t("darkMode") : t("lightMode")}
    >
      {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </button>
  );
}
