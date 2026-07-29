import { useState, useMemo } from "react";
import { CartItem, PaymentMethod } from "../types";
import { useI18n } from "../i18n/I18nContext";
import { X, Receipt, Banknote, CreditCard, Wallet, Percent, Tag } from "lucide-react";

interface Props {
  cart: CartItem[];
  isOpen: boolean;
  onClose: () => void;
  onCheckout: (paymentMethod: PaymentMethod, amountTendered: number, discountAmount: number) => void;
  isCheckingOut: boolean;
}

export default function CheckoutModal({ cart, isOpen, onClose, onCheckout, isCheckingOut }: Props) {
  const { t } = useI18n();
  const currency = t("currency");
  const fmt = (n: number) => Math.round(n).toLocaleString("de-DE");

  const paymentOptions: { key: PaymentMethod; label: string; icon: typeof Banknote }[] = [
    { key: "cash", label: t("cash"), icon: Banknote },
    { key: "card", label: t("card"), icon: CreditCard },
    { key: "other", label: t("other"), icon: Wallet },
  ];
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [discountPercent, setDiscountPercent] = useState<string>("0");
  const [amountTendered, setAmountTendered] = useState<string>("");

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
    [cart]
  );

  const discountAmount = useMemo(() => {
    const percent = Math.max(0, Math.min(100, Number(discountPercent) || 0));
    return (subtotal * percent) / 100;
  }, [subtotal, discountPercent]);

  const total = useMemo(() => Math.max(0, subtotal - discountAmount), [subtotal, discountAmount]);

  const change = useMemo(() => {
    if (paymentMethod !== "cash") return 0;
    const tendered = Number(amountTendered) || 0;
    return Math.max(0, tendered - total);
  }, [paymentMethod, amountTendered, total]);

  const isValid = useMemo(() => {
    if (paymentMethod === "cash") {
      return (Number(amountTendered) || 0) >= total;
    }
    return true;
  }, [paymentMethod, amountTendered, total]);

  const handleSubmit = () => {
    if (!isValid) return;
    onCheckout(paymentMethod, Number(amountTendered) || 0, discountAmount);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="mx-auto w-full max-w-[calc(100%-2rem)] sm:max-w-md rounded-2xl bg-white p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <Receipt size={18} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">{t("payment")}</h2>
          </div>
          <button onClick={onClose} className="btn-icon" aria-label={t("close")}>
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 space-y-1 rounded-xl bg-slate-50 p-3 text-sm">
          {cart.map((item) => (
            <div key={item.id} className="flex justify-between text-slate-600">
                    <span>
                {item.quantity}x {item.name}
              </span>
              <span className="font-medium">{fmt(Number(item.price) * item.quantity)} {currency}</span>
            </div>
          ))}
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            {t("payment")}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {paymentOptions.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setPaymentMethod(key)}
                className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-sm font-medium transition ${
                  paymentMethod === key
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon size={20} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {paymentMethod === "cash" && (
          <div className="mb-4">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {t("received")}
            </label>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="1"
                placeholder={fmt(total)}
                value={amountTendered}
                onChange={(e) => setAmountTendered(e.target.value)}
                className="input pr-14 text-right"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{currency}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[500, 1000, 2000, 5000, 10000].map((bill) => (
                <button
                  key={bill}
                  type="button"
                  onClick={() => setAmountTendered(String((Number(amountTendered) || 0) + bill))}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  +{fmt(bill)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmountTendered(String(Math.ceil(total)))}
                className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
              >
                {t("toPay")}
              </button>
            </div>
            {change > 0 && (
              <p className="mt-2 text-sm font-semibold text-emerald-600">
                {t("change")}: {fmt(change)} {currency}
              </p>
            )}
            {!isValid && amountTendered !== "" && (
              <p className="mt-2 text-sm text-red-600">
                {t("receivedTooLow", { amount: fmt(total), currency })}
              </p>
            )}
          </div>
        )}

        <div className="mb-4">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            {t("discount")}
          </label>
          <div className="relative">
            <Percent
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              className="input pl-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
          </div>
          {discountAmount > 0 && (
            <p className="mt-2 flex items-center gap-1 text-sm text-emerald-600">
              <Tag size={14} />
              {t("savings")}: {fmt(discountAmount)} {currency}
            </p>
          )}
        </div>

        <div className="mb-6 space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>{t("subtotal")}</span>
            <span>{fmt(subtotal)} {currency}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>{t("discount")}</span>
              <span>-{fmt(discountAmount)} {currency}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold text-slate-900">
            <span>{t("toPay")}</span>
            <span>{fmt(total)} {currency}</span>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!isValid || isCheckingOut}
          className="btn-primary w-full"
        >
          {isCheckingOut ? t("processing") : `${t("checkout")} (${fmt(total)} ${currency})`}
        </button>
      </div>
    </div>
  );
}
