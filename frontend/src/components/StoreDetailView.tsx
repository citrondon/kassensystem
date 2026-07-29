import { useState, useEffect, useCallback } from "react";
import { getStoreDetail } from "../services/api";
import { useI18n } from "../i18n/I18nContext";
import { ArrowLeft, BarChart3, TrendingUp, Crown, Loader2 } from "lucide-react";

type StoreDetailProps = {
  storeId: number;
  storeName?: string;
  onBack: () => void;
};

export default function StoreDetailView({ storeId, storeName, onBack }: StoreDetailProps) {
  const { t, lang } = useI18n();
  const [detail, setDetail] = useState<{
    store: { id: number; name: string; location: string | null };
    snapshots: {
      snapshot_date: string;
      total_orders: number;
      total_revenue: number;
      total_discount: number;
      top_products: { name: string; category: string; quantity: number; revenue: number }[];
    }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const locale = lang === "fr" ? "fr-FR" : "de-DE";
  const fmt = (n: number) => Math.round(n).toLocaleString(locale);
  const currency = t("currency");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStoreDetail(storeId);
      if (res.success) setDetail(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  const snapshots = detail?.snapshots || [];
  const storeTotalRevenue = snapshots.reduce((sum, s) => sum + Number(s.total_revenue), 0);
  const storeTotalOrders = snapshots.reduce((sum, s) => sum + Number(s.total_orders), 0);
  const storeMaxRevenue = Math.max(...snapshots.map((s) => Number(s.total_revenue)), 1);

  const bestsellers = aggregateBestsellers(snapshots);

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="btn-secondary flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" />
        {t("storeCol")}: {detail?.store?.name || storeName || "..."}
      </button>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:gap-4 sm:p-5 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 sm:h-12 sm:w-12">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-500 sm:text-sm dark:text-slate-400">{t("totalOrdersAll")}</p>
                <p className="text-base font-bold text-slate-800 sm:text-xl dark:text-slate-200">{String(storeTotalOrders)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:gap-4 sm:p-5 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 sm:h-12 sm:w-12">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-500 sm:text-sm dark:text-slate-400">{t("totalRevenueAll")}</p>
                <p className="text-base font-bold text-slate-800 sm:text-xl dark:text-slate-200">{fmt(storeTotalRevenue)} {currency}</p>
              </div>
            </div>
          </div>

          <div className="panel p-5 dark:bg-slate-800">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100">
              <Crown className="h-5 w-5 text-amber-500" />{t("bestsellers")}
            </h2>
            {bestsellers.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">{t("noDataSync")}</p>
            ) : (
              <ul className="space-y-2">
                {bestsellers.map((item, i) => (
                  <li key={item.product_name} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 dark:border-slate-700">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{item.product_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{Number(item.total_quantity)}×</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{fmt(Number(item.total_revenue))} {currency}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="panel p-5 dark:bg-slate-800">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100">
              <TrendingUp className="h-5 w-5 text-emerald-500" />{t("salesTrend")}
            </h2>
            {snapshots.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">{t("noDataSync")}</p>
            ) : (
              <div className="flex h-48 items-end gap-1 overflow-x-auto">
                {snapshots.map((d) => {
                  const pct = (Number(d.total_revenue) / storeMaxRevenue) * 100;
                  return (
                    <div key={d.snapshot_date} className="group relative flex flex-1 flex-col items-center justify-end" style={{ minWidth: "24px" }}>
                      <div className="w-full rounded-t bg-gradient-to-t from-emerald-400 to-emerald-500 transition group-hover:from-emerald-500 group-hover:to-emerald-600" style={{ height: `${Math.max(pct, 2)}%` }} />
                      <div className="absolute -top-8 hidden whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs text-white group-hover:block">
                        {d.snapshot_date}: {fmt(Number(d.total_revenue))} {currency}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function aggregateBestsellers(
  snapshots: { top_products: { name: string; category: string; quantity: number; revenue: number }[] }[]
): { product_name: string; category: string; total_quantity: number; total_revenue: number }[] {
  const map = new Map<string, { product_name: string; category: string; total_quantity: number; total_revenue: number }>();
  for (const snap of snapshots) {
    for (const p of snap.top_products || []) {
      const existing = map.get(p.name);
      if (existing) {
        existing.total_quantity += Number(p.quantity);
        existing.total_revenue += Number(p.revenue);
      } else {
        map.set(p.name, {
          product_name: p.name,
          category: p.category,
          total_quantity: Number(p.quantity),
          total_revenue: Number(p.revenue),
        });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => b.total_quantity - a.total_quantity);
}
