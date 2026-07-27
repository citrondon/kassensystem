import { useState, useEffect, useCallback } from "react";
import { AnalyticsSummary, StoreSummary, Bestseller, TrendPoint } from "../types";
import { getAnalyticsSummary, getBestsellers, getTrends } from "../services/api";
import { useI18n } from "../i18n/I18nContext";
import {
  BarChart3,
  Store,
  TrendingUp,
  Package,
  Loader2,
  RefreshCw,
  Crown,
} from "lucide-react";

export default function AnalyticsDashboard() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [bestsellers, setBestsellers] = useState<Bestseller[]>([]);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, b, tr] = await Promise.all([
        getAnalyticsSummary(),
        getBestsellers(undefined, undefined, 10),
        getTrends(),
      ]);
      setSummary(s.summary);
      setStores(s.stores);
      setBestsellers(b.bestsellers);
      setTrends(tr.trends);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const fmt = (n: number) => Math.round(n).toLocaleString("de-DE");
  const currency = t("currency");

  // Simple inline bar chart for trends
  const maxRevenue = Math.max(...trends.map((d) => Number(d.revenue)), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
            <BarChart3 className="h-7 w-7 text-indigo-600" />
            Analytics Dashboard
          </h1>
          <p className="text-sm text-slate-500">Cross-Store Verkaufsanalyse · nur für Entwickler</p>
        </div>
        <button
          onClick={load}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          {t("refresh")}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-4">
            <StatCard
              label="Aktive Stores"
              value={String(summary?.activeStores ?? 0)}
              icon={<Store className="h-6 w-6 text-indigo-600" />}
              bg="bg-indigo-50"
            />
            <StatCard
              label="Gesamt-Umsatz"
              value={`${fmt(summary?.totalRevenue ?? 0)} ${currency}`}
              icon={<TrendingUp className="h-6 w-6 text-emerald-600" />}
              bg="bg-emerald-50"
            />
            <StatCard
              label="Gesamt-Bestellungen"
              value={String(summary?.totalOrders ?? 0)}
              icon={<BarChart3 className="h-6 w-6 text-blue-600" />}
              bg="bg-blue-50"
            />
            <StatCard
              label="Gesamt-Rabatt"
              value={`${fmt(summary?.totalDiscount ?? 0)} ${currency}`}
              icon={<Package className="h-6 w-6 text-amber-600" />}
              bg="bg-amber-50"
            />
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Bestsellers */}
            <div className="panel p-5">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
                <Crown className="h-5 w-5 text-amber-500" />
                Top-Produkte (alle Stores)
              </h2>
              {bestsellers.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">Keine Daten vorhanden.</p>
              ) : (
                <ul className="space-y-2">
                  {bestsellers.map((item, i) => (
                    <li
                      key={item.product_name}
                      className="flex items-center gap-3 rounded-lg border border-slate-100 p-3"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {item.product_name}
                        </p>
                        <p className="text-xs text-slate-500">{item.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-800">
                          {Number(item.total_quantity)}×
                        </p>
                        <p className="text-xs text-slate-500">
                          {fmt(Number(item.total_revenue))} {currency}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Trend chart (simple CSS bars) */}
            <div className="panel p-5">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Umsatz-Trend (30 Tage)
              </h2>
              {trends.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">Keine Daten vorhanden.</p>
              ) : (
                <div className="flex h-48 items-end gap-1 overflow-x-auto">
                  {trends.map((d) => {
                    const pct = (Number(d.revenue) / maxRevenue) * 100;
                    return (
                      <div
                        key={d.snapshot_date}
                        className="group relative flex flex-1 flex-col items-center justify-end"
                        style={{ minWidth: "8px" }}
                      >
                        <div
                          className="w-full rounded-t bg-gradient-to-t from-indigo-400 to-indigo-500 transition group-hover:from-indigo-500 group-hover:to-indigo-600"
                          style={{ height: `${Math.max(pct, 2)}%` }}
                        />
                        <div className="absolute -top-8 hidden whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs text-white group-hover:block">
                          {d.snapshot_date}: {fmt(Number(d.revenue))} {currency}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Store comparison table */}
          <div className="panel p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
              <Store className="h-5 w-5 text-indigo-500" />
              Store-Vergleich
            </h2>
            {stores.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">Keine Stores registriert.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                      <th className="pb-2 pr-4">Store</th>
                      <th className="pb-2 pr-4">Ort</th>
                      <th className="pb-2 pr-4 text-right">Bestellungen</th>
                      <th className="pb-2 text-right">Umsatz</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stores.map((s) => (
                      <tr key={s.id} className="border-b border-slate-50">
                        <td className="py-3 pr-4 font-medium text-slate-800">{s.name}</td>
                        <td className="py-3 pr-4 text-slate-500">{s.location || "—"}</td>
                        <td className="py-3 pr-4 text-right text-slate-700">{Number(s.orders)}</td>
                        <td className="py-3 text-right font-bold text-slate-800">
                          {fmt(Number(s.revenue))} {currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Date range */}
          {summary && (
            <p className="text-center text-xs text-slate-400">
              Zeitraum: {summary.dateRange.from} bis {summary.dateRange.to}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  bg,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  bg: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:gap-4 sm:p-5">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} sm:h-12 sm:w-12`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
        <p className="text-base font-bold text-slate-800 sm:text-xl">{value}</p>
      </div>
    </div>
  );
}
