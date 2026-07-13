import { useState, useEffect, useCallback } from "react";
import { getDailyReport, getTopProducts, DailyReport, TopProduct } from "../services/api";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../contexts/AuthContext";
import {
  TrendingUp,
  ShoppingBag,
  Banknote,
  CreditCard,
  Wallet,
  Percent,
  Package,
  Loader2,
  Calendar,
  Printer,
  BarChart3,
} from "lucide-react";

export default function ReportsView() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, tp] = await Promise.all([
        getDailyReport(date),
        getTopProducts(date, 10),
      ]);
      setReport(r);
      setTopProducts(tp);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorLoading"));
    } finally {
      setLoading(false);
    }
  }, [date, t]);

  useEffect(() => {
    load();
  }, [load]);

  const currency = t("currency");
  const locale = lang === "fr" ? "fr-FR" : "de-DE";

  if (user?.role !== "manager") {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-500">{t("errorLoading")}</p>
      </div>
    );
  }

  const summaryCards = report
    ? [
        {
          label: t("totalOrders"),
          value: String(report.total_orders),
          icon: <ShoppingBag className="h-6 w-6 text-indigo-600" />,
          bg: "bg-indigo-50",
        },
        {
          label: t("grossAmount"),
          value: `${Number(report.gross_amount).toFixed(2)} ${currency}`,
          icon: <TrendingUp className="h-6 w-6 text-emerald-600" />,
          bg: "bg-emerald-50",
        },
        {
          label: t("totalDiscount"),
          value: `${Number(report.discount_amount).toFixed(2)} ${currency}`,
          icon: <Percent className="h-6 w-6 text-amber-600" />,
          bg: "bg-amber-50",
        },
        {
          label: t("netAmount"),
          value: `${Number(report.net_amount).toFixed(2)} ${currency}`,
          icon: <BarChart3 className="h-6 w-6 text-blue-600" />,
          bg: "bg-blue-50",
        },
      ]
    : [];

  const paymentCards = report
    ? [
        {
          label: t("cashSales"),
          orders: report.cash_orders,
          amount: Number(report.cash_amount).toFixed(2),
          icon: <Banknote className="h-5 w-5 text-emerald-600" />,
          bg: "bg-emerald-50",
        },
        {
          label: t("cardSales"),
          orders: report.card_orders,
          amount: Number(report.card_amount).toFixed(2),
          icon: <CreditCard className="h-5 w-5 text-indigo-600" />,
          bg: "bg-indigo-50",
        },
        {
          label: t("otherSales"),
          orders: report.other_orders,
          amount: Number(report.other_amount).toFixed(2),
          icon: <Wallet className="h-5 w-5 text-slate-600" />,
          bg: "bg-slate-50",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t("zReport")}</h1>
          <p className="text-slate-500">{t("dailyReport")}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input pl-10"
              max={new Date().toISOString().split("T")[0]}
            />
          </div>
          <button
            onClick={() => window.print()}
            className="btn-secondary flex items-center gap-2"
          >
            <Printer className="h-5 w-5" />
            <span className="hidden sm:inline">{t("printReport")}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : error ? (
        <div className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700 border border-red-200">
          {error}
        </div>
      ) : report && report.total_orders === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Package className="h-12 w-12 text-slate-300 mb-3" />
          <p className="text-slate-500">{t("noSalesToday")}</p>
        </div>
      ) : report ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.bg}`}>
                  {card.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">{card.label}</p>
                  <p className="text-xl font-bold text-slate-800">{card.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Payment breakdown */}
          <div className="panel p-5">
            <h2 className="mb-4 text-lg font-bold text-slate-800">{t("paymentBreakdown")}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {paymentCards.map((card) => (
                <div
                  key={card.label}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bg}`}>
                    {card.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-500">{card.label}</p>
                    <p className="text-lg font-bold text-slate-800">
                      {card.amount} {currency}
                    </p>
                    <p className="text-xs text-slate-400">
                      {card.orders} {t("order")}s
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top products */}
          {topProducts.length > 0 && (
            <div className="panel p-5">
              <h2 className="mb-4 text-lg font-bold text-slate-800">{t("topProducts")}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="pb-2 pr-4 font-medium">{t("product")}</th>
                      <th className="pb-2 pr-4 text-right font-medium">{t("quantitySold")}</th>
                      <th className="pb-2 text-right font-medium">{t("revenue")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((p, i) => (
                      <tr key={p.product_id} className="border-b border-slate-100">
                        <td className="py-3 pr-4">
                          <span className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-xs font-bold text-indigo-700">
                              {i + 1}
                            </span>
                            <span className="font-medium text-slate-800">{p.product_name}</span>
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-right text-slate-700">{p.quantity_sold}</td>
                        <td className="py-3 text-right font-semibold text-slate-800">
                          {Number(p.revenue).toFixed(2)} {currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Print footer */}
          <div className="hidden print:block mt-8 text-center text-xs text-slate-400">
            {t("zReport")} —{" "}
            {new Date(date).toLocaleDateString(locale, {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}{" "}
            — {new Date().toLocaleString(locale)}
          </div>
        </>
      ) : null}
    </div>
  );
}
