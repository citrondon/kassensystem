import { LayoutDashboard, ShoppingCart, Package, ClipboardList, BarChart3 } from "lucide-react";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../contexts/AuthContext";

type View = "dashboard" | "cashier" | "inventory" | "orders" | "reports";

interface Props {
  active: View;
  onChange: (view: View) => void;
}

export default function MobileNav({ active, onChange }: Props) {
  const { t } = useI18n();
  const { user } = useAuth();
  const isManager = user?.role === "manager";

  const items: { key: View; label: string; icon: React.ReactNode; managerOnly?: boolean }[] = ([
    {
      key: "dashboard" as View,
      label: t("dashboard"),
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      key: "cashier" as View,
      label: t("cashier"),
      icon: <ShoppingCart className="h-5 w-5" />,
    },
    {
      key: "inventory" as View,
      label: t("inventory"),
      icon: <Package className="h-5 w-5" />,
    },
    {
      key: "orders" as View,
      label: t("sales"),
      icon: <ClipboardList className="h-5 w-5" />,
    },
    {
      key: "reports" as View,
      label: t("reports"),
      icon: <BarChart3 className="h-5 w-5" />,
      managerOnly: true,
    },
  ] as { key: View; label: string; icon: React.ReactNode; managerOnly?: boolean }[]).filter(
    (item) => !item.managerOnly || isManager
  );
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white lg:hidden">
      <div className="mx-auto flex max-w-md">
        {items.map((item) => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition ${
                isActive
                  ? "text-indigo-700"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <span className={isActive ? "text-indigo-600" : ""}>
                {item.icon}
              </span>
              {item.label}
              {isActive && (
                <span className="absolute bottom-1 h-1 w-8 rounded-full bg-indigo-600" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
