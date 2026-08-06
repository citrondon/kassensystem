import { useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import { TranslationKey } from "../i18n/translations";
import {
  CheckCircle2,
  Circle,
  X,
  Package,
  ShoppingBag,
  UserPlus,
  ClipboardList,
  ArrowRight,
  PartyPopper,
} from "lucide-react";

type Target = "cashier" | "inventory" | "orders";

interface Props {
  productsCount: number;
  ordersCount: number;
  cashierCount: number | null;
  onNavigate: (view: Target) => void;
}

// Persistenz pro Store (Lizenz-Store-Id), damit ein neuer Kunde auf demselben
// Gerät die Checkliste wieder sieht.
function storeSuffix(): string {
  try {
    const info = localStorage.getItem("pos_license_info");
    return info ? String(JSON.parse(info).storeId) : "default";
  } catch {
    return "default";
  }
}

const dismissedKey = () => `pos_onboarding_dismissed_${storeSuffix()}`;
const visitedOrdersKey = () => `pos_onboarding_visited_orders_${storeSuffix()}`;

export default function OnboardingChecklist({
  productsCount,
  ordersCount,
  cashierCount,
  onNavigate,
}: Props) {
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(dismissedKey()) === "1"
  );
  const [visitedOrders, setVisitedOrders] = useState(
    () => localStorage.getItem(visitedOrdersKey()) === "1"
  );

  if (dismissed) return null;

  const steps: {
    id: string;
    titleKey: TranslationKey;
    hintKey: TranslationKey;
    icon: React.ReactNode;
    done: boolean;
    target: Target | null;
  }[] = [
    {
      id: "product",
      titleKey: "onboardingStep1Title",
      hintKey: "onboardingStep1Hint",
      icon: <Package className="h-5 w-5" />,
      done: productsCount > 0,
      target: "inventory",
    },
    {
      id: "sale",
      titleKey: "onboardingStep2Title",
      hintKey: "onboardingStep2Hint",
      icon: <ShoppingBag className="h-5 w-5" />,
      done: ordersCount > 0,
      target: "cashier",
    },
    {
      id: "cashier",
      titleKey: "onboardingStep3Title",
      hintKey: "onboardingStep3Hint",
      icon: <UserPlus className="h-5 w-5" />,
      done: (cashierCount ?? 0) > 0,
      target: null, // nur Hinweis: Einstellungen oben rechts
    },
    {
      id: "report",
      titleKey: "onboardingStep4Title",
      hintKey: "onboardingStep4Hint",
      icon: <ClipboardList className="h-5 w-5" />,
      done: visitedOrders,
      target: "orders",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  function hide() {
    localStorage.setItem(dismissedKey(), "1");
    setDismissed(true);
  }

  function handleStepClick(step: (typeof steps)[number]) {
    if (!step.target) return;
    if (step.id === "report" && !visitedOrders) {
      localStorage.setItem(visitedOrdersKey(), "1");
      setVisitedOrders(true);
    }
    onNavigate(step.target);
  }

  if (allDone) {
    return (
      <div className="panel flex items-center justify-between gap-3 border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
        <div className="flex items-center gap-3">
          <PartyPopper className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
            {t("onboardingDone")}
          </p>
        </div>
        <button
          onClick={hide}
          className="rounded-lg p-2 text-emerald-600 transition hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
          aria-label={t("onboardingHide")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {t("onboardingTitle")}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("onboardingSubtitle")} ·{" "}
            {t("onboardingProgress", { done: doneCount, total: steps.length })}
          </p>
        </div>
        <button
          onClick={hide}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          aria-label={t("onboardingHide")}
          title={t("onboardingHide")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Fortschrittsbalken */}
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>

      <ul className="flex flex-col gap-2">
        {steps.map((step) => (
          <li key={step.id}>
            <button
              onClick={() => handleStepClick(step)}
              disabled={!step.target}
              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                step.done
                  ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-900/10"
                  : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-700 dark:hover:bg-slate-700/50"
              } ${step.target ? "" : "cursor-default"}`}
            >
              {step.done ? (
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Circle className="h-5 w-5 flex-shrink-0 text-slate-300 dark:text-slate-600" />
              )}
              <span
                className={`flex-shrink-0 ${
                  step.done
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-indigo-600 dark:text-indigo-400"
                }`}
              >
                {step.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-sm font-semibold ${
                    step.done
                      ? "text-emerald-800 line-through dark:text-emerald-200"
                      : "text-slate-800 dark:text-slate-100"
                  }`}
                >
                  {t(step.titleKey)}
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {t(step.hintKey)}
                </span>
              </span>
              {step.target && !step.done && (
                <ArrowRight className="h-4 w-4 flex-shrink-0 text-slate-300 dark:text-slate-600" />
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
