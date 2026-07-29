import { useState, useEffect, useCallback } from "react";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../contexts/AuthContext";
import { getAnalyticsSummary } from "../services/api";
import { TrendingUp, Loader2, ShoppingBag, Store, Coins } from "lucide-react";

export default function ReportsView() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [summary, setSummary] = useState<{ totalOrders: number; totalRevenue: number; activeStores: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAnalyticsSummary();
      if (res.success) setSummary(res.summary);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (user?.role !== "manager" && user?.role !== "developer") {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-500 dark:text-slate-400">{t("errorLoading")}</p>
      </div>
    );
  }

  const locale = lang === "fr" ? "fr-FR" : "de-DE";
  const currency = t("currency");
  const fmt = (n: number) => Math.round(n).toLocaleString(locale);

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800 dark:text-slate-100">
        <TrendingUp className="h-7 w-7 text-indigo-600" />
        {t("analytics")}
      </h1>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="panel p-5 dark:bg-slate-800">
            <div className="mb-2 flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <ShoppingBag className="h-5 w-5" />
              <span className="text-sm font-medium">{t("totalOrdersAll")}</span>
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{summary?.totalOrders ?? 0}</p>
          </div>
          <div className="panel p-5 dark:bg-slate-800">
            <div className="mb-2 flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Coins className="h-5 w-5" />
              <span className="text-sm font-medium">{t("totalRevenueAll")}</span>
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{fmt(summary?.totalRevenue ?? 0)} {currency}</p>
          </div>
          <div className="panel p-5 dark:bg-slate-800">
            <div className="mb-2 flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Store className="h-5 w-5" />
              <span className="text-sm font-medium">{t("activeStores")}</span>
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{summary?.activeStores ?? 0}</p>
          </div>
        </div>
      )}
    </div>
  );
}
