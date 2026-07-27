import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../i18n/I18nContext";
import LanguageSwitcher from "./LanguageSwitcher";
import { LogOut, User } from "lucide-react";

export default function Header() {
  const { user, logout } = useAuth();
  const { t } = useI18n();

  if (!user) return null;

  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-slate-200 bg-white px-3 py-2.5 lg:ml-64 lg:px-4 lg:py-3">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <User className="h-4 w-4" />
          <span className="font-medium">{user.username}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
            {user.role === "developer" ? "Developer" : user.role === "manager" ? t("manager") : t("cashierRole")}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" />
            {t("logout")}
          </button>
        </div>
      </div>
    </header>
  );
}
