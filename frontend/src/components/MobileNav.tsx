import { LayoutDashboard, ShoppingCart, Package, ClipboardList, BarChart3 } from "lucide-react";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../contexts/AuthContext";

type View = "dashboard" | "cashier" | "inventory" | "orders" | "analytics";

interface Props {
  active: View;
  onChange: (view: View) => void;
}

/**
 * Mobile Bottom-Navigation – inspiriert vom "BazarStock"-Projekt eines Freundes.
 * Ergänzt die Desktop-Sidebar auf kleinen Screens mit einer klassischen
 * Touch-optimierten Bottom-Bar (max-width 480px-Style, aber mit unserem Design-System).
 */
export default function MobileNav({ active, onChange }: Props) {
  const { t } = useI18n();
  const { user } = useAuth();
  const isDeveloper = user?.role === "developer";

  const items: { key: View; label: string; icon: React.ReactNode }[] = [
    {
      key: "dashboard",
      label: t("dashboard"),
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      key: "cashier",
      label: t("cashier"),
      icon: <ShoppingCart className="h-5 w-5" />,
    },
    {
      key: "inventory",
      label: t("inventory"),
      icon: <Package className="h-5 w-5" />,
    },
    {
      key: "orders",
      label: t("sales"),
      icon: <ClipboardList className="h-5 w-5" />,
    },
    ...(isDeveloper
      ? [{
          key: "analytics" as View,
          label: "Analytics",
          icon: <BarChart3 className="h-5 w-5" />,
        }]
      : []),
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
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
