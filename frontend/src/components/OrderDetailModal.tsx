import { useEffect, useState } from "react";
import { OrderDetail } from "../types";
import { getOrderById } from "../services/api";
import { useI18n } from "../i18n/I18nContext";
import { X, Receipt, Loader2 } from "lucide-react";

interface Props {
  orderId: number;
  onClose: () => void;
}

export default function OrderDetailModal({ orderId, onClose }: Props) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t, lang } = useI18n();
  const currency = t("currency");
  const fmt = (n: number) => Math.round(n).toLocaleString("de-DE");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getOrderById(orderId);
        setOrder(data);
      } catch {
        setError(t("errorLoading"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [orderId, t]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(lang === "fr" ? "fr-FR" : "de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-6 w-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-800">
              {t("order")} #{orderId}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label={t("close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading && (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">{t("loadingOrder")}</p>
          </div>
        )}

        {error && <p className="py-8 text-center text-red-600 font-medium">{error}</p>}

        {order && (
          <div>
            <p className="mb-4 text-sm font-medium text-slate-500">
              {formatDate(order.order_date)}
            </p>

            {order.cashier_name && (
              <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
                {t("cashierName")}: {order.cashier_name}
              </p>
            )}

            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-2 text-left">{t("product")}</th>
                  <th className="py-2 text-right">{t("quantity")}</th>
                  <th className="py-2 text-right">{t("unitPrice")}</th>
                  <th className="py-2 text-right">{t("total")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2 font-semibold text-slate-800">
                      {item.product_name}
                    </td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2 text-right">
                      {fmt(Number(item.unit_price))} {currency}
                    </td>
                    <td className="py-2 text-right font-bold text-slate-800">
                      {fmt(Number(item.line_total))} {currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex justify-between border-t border-slate-100 pt-3 text-lg font-extrabold text-slate-900">
              <span>{t("total")}</span>
              <span>{fmt(Number(order.total_amount))} {currency}</span>
            </div>

            <button
              onClick={onClose}
              className="mt-4 w-full rounded-xl bg-slate-100 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              {t("close")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
