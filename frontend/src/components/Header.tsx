import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../i18n/I18nContext";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import { LogOut, User, Settings } from "lucide-react";

interface Props {
  onOpenSettings?: () => void;
}

export default function Header({ onOpenSettings }: Props) {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const isManager = user?.role === "manager" || user?.role === "developer";

  if (!user) return null;

  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-slate-200 bg-white px-3 py-2.5 lg:ml-64 lg:px-4 lg:py-3 dark:border-slate-700 dark:bg-slate-800">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <User className="h-4 w-4" />
          <span className="font-medium">{user.username}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-700 dark:text-slate-400">
            {user.role === "developer" ? "Developer" : user.role === "manager" ? t("manager") : t("cashierRole")}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isManager && onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Einstellungen</span>
            </button>
          )}
          <ThemeToggle />
          <LanguageSwitcher />
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <LogOut className="h-4 w-4" />
            {t("logout")}
          </button>
        </div>
      </div>
    </header>
  );
}
