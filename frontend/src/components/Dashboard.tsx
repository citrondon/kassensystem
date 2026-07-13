import { useState, useEffect, useCallback } from "react";
import { Product, OrderListItem } from "../types";
import { getProducts, getOrders, getSalesOverTime, getPeakHours, getTopProducts, SalesOverTimeRow, PeakHoursRow, TopProduct } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../i18n/I18nContext";
import {
  TrendingUp,
  ShoppingBag,
  AlertTriangle,
  PackageX,
  ArrowRight,
  Loader2,
  Store,
  BarChart3,
  Clock,
  Trophy,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

type View = "dashboard" | "cashier" | "inventory" | "orders" | "reports";

interface Props {
  onNavigate: (view: View) => void;
}

export default function Dashboard({ onNavigate }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [salesData, setSalesData] = useState<SalesOverTimeRow[]>([]);
  const [peakData, setPeakData] = useState<PeakHoursRow[]>([]);
  const [topProductsData, setTopProductsData] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const isManager = user?.role === "manager";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, o] = await Promise.all([getProducts(), getOrders()]);
      setProducts(p);
      setOrders(o);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCharts = useCallback(async () => {
    if (!isManager) return;
    setChartsLoading(true);
    try {
      const [s, ph, tp] = await Promise.all([
        getSalesOverTime(7),
        getPeakHours(),
        getTopProducts(undefined, 5),
      ]);
      setSalesData(s);
      setPeakData(ph);
      setTopProductsData(tp);
    } catch {
      // ignore
    } finally {
      setChartsLoading(false);
    }
  }, [isManager]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadCharts();
  }, [loadCharts]);

  const todayStr = new Date().toISOString().split("T")[0];
  const todayOrders = orders.filter((o) => o.order_date.startsWith(todayStr));
  const todayRevenue = todayOrders.reduce(
    (sum, o) => sum + Number(o.total_amount),
    0
  );
  const lowStockCount = products.filter(
    (p) => p.stock > 0 && p.stock <= p.low_stock_threshold
  ).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;
  const totalValue = products.reduce(
    (sum, p) => sum + Number(p.price) * p.stock,
    0
  );

  const currency = t("currency");

  const cards = [
    {
      label: t("todayRevenue"),
      value: `${todayRevenue.toFixed(2)} ${currency}`,
      icon: <TrendingUp className="h-6 w-6 text-emerald-600" />,
      bg: "bg-emerald-50",
      onClick: () => onNavigate("orders"),
    },
    {
      label: t("todayOrders"),
      value: String(todayOrders.length),
      icon: <ShoppingBag className="h-6 w-6 text-indigo-600" />,
      bg: "bg-indigo-50",
      onClick: () => onNavigate("orders"),
    },
    {
      label: t("inventoryValue"),
      value: `${totalValue.toFixed(2)} ${currency}`,
      icon: <Store className="h-6 w-6 text-blue-600" />,
      bg: "bg-blue-50",
      onClick: () => onNavigate("inventory"),
      managerOnly: true,
    },
    {
      label: t("lowStock"),
      value: String(lowStockCount),
      icon: <AlertTriangle className="h-6 w-6 text-amber-600" />,
      bg: "bg-amber-50",
      onClick: () => onNavigate("inventory"),
    },
    {
      label: t("outOfStock"),
      value: String(outOfStockCount),
      icon: <PackageX className="h-6 w-6 text-red-600" />,
      bg: "bg-red-50",
      onClick: () => onNavigate("inventory"),
    },
  ].filter((card) => !card.managerOnly || isManager);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{t("dashboard")}</h1>
        <p className="text-slate-500">{t("overview")}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {cards.map((card) => (
            <button
              key={card.label}
              onClick={card.onClick}
              className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:shadow-md hover:-translate-y-0.5"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.bg}`}>
                {card.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <p className="text-xl font-bold text-slate-800">{card.value}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-300" />
            </button>
          ))}
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="panel p-5">
            <h2 className="mb-4 text-lg font-bold text-slate-800">{t("quickAccess")}</h2>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => onNavigate("cashier")}
                className="btn-primary flex items-center justify-center gap-2"
              >
                <ShoppingBag className="h-5 w-5" />
                {t("openCashier")}
              </button>
              <button
                onClick={() => onNavigate("inventory")}
                className="btn-secondary flex items-center justify-center gap-2"
              >
                <PackageX className="h-5 w-5" />
                {t("manageInventory")}
              </button>
            </div>
          </div>

          <div className="panel p-5">
            <h2 className="mb-4 text-lg font-bold text-slate-800">{t("lastOrders")}</h2>
            {orders.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-4">{t("noOrdersYet")}</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {orders.slice(0, 5).map((order) => (
                  <li
                    key={order.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {t("order")} #{order.id}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(order.order_date).toLocaleString(lang === "fr" ? "fr-FR" : "de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-slate-800">
                      {Number(order.total_amount).toFixed(2)} {currency}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Charts — Manager only */}
      {!loading && isManager && (
        <div className="space-y-4">
          {chartsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              <span className="ml-3 text-slate-500">{t("loadingCharts")}</span>
            </div>
          ) : salesData.length === 0 && peakData.length === 0 && topProductsData.length === 0 ? (
            <div className="panel p-8 text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <p className="text-slate-500">{t("noChartData")}</p>
            </div>
          ) : (
            <>
              {/* Sales over time — Line chart */}
              {salesData.length > 0 && (
                <div className="panel p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                    <h2 className="text-lg font-bold text-slate-800">{t("salesOverTime")}</h2>
                    <span className="ml-auto text-xs text-slate-400">{t("last7Days")}</span>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={salesData.map((d) => ({
                      date: new Date(d.date).toLocaleDateString(lang === "fr" ? "fr-FR" : "de-DE", { day: "2-digit", month: "2-digit" }),
                      revenue: Number(d.net_amount),
                      orders: d.total_orders,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#64748b" }} />
                      <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                      <Tooltip
                        contentStyle={{ borderRadius: "0.75rem", border: "1px solid #e2e8f0", fontSize: "0.875rem" }}
                        formatter={(value: unknown) => [`${Number(value).toFixed(2)} ${currency}`, t("sales")]}
                      />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 4, fill: "#10b981" }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Peak hours — Bar chart */}
                {peakData.length > 0 && (
                  <div className="panel p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-indigo-600" />
                      <h2 className="text-lg font-bold text-slate-800">{t("peakHours")}</h2>
                      <span className="ml-auto text-xs text-slate-400">{t("hourlyDistribution")}</span>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={peakData.map((d) => ({
                        hour: `${d.hour}:00`,
                        orders: d.total_orders,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#64748b" }} />
                        <YAxis tick={{ fontSize: 12, fill: "#64748b" }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ borderRadius: "0.75rem", border: "1px solid #e2e8f0", fontSize: "0.875rem" }}
                          formatter={(value: unknown) => [Number(value), t("orders")]}
                        />
                        <Bar dataKey="orders" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Top products — Horizontal bar chart */}
                {topProductsData.length > 0 && (
                  <div className="panel p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-amber-600" />
                      <h2 className="text-lg font-bold text-slate-800">{t("topProductsChart")}</h2>
                      <span className="ml-auto text-xs text-slate-400">{t("today")}</span>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={topProductsData.map((d) => ({
                          name: d.product_name,
                          quantity: Number(d.quantity_sold),
                        }))}
                        layout="vertical"
                        margin={{ left: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" tick={{ fontSize: 12, fill: "#64748b" }} allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 12, fill: "#64748b" }}
                          width={90}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: "0.75rem", border: "1px solid #e2e8f0", fontSize: "0.875rem" }}
                          formatter={(value: unknown) => [Number(value), t("quantitySold")]}
                        />
                        <Bar dataKey="quantity" radius={[0, 4, 4, 0]}>
                          {topProductsData.map((_, i) => (
                            <Cell key={i} fill={["#f59e0b", "#f97316", "#eab308", "#fbbf24", "#fcd34d"][i % 5]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
