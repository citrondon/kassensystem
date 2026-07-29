import { CartItem } from "../types";
import { useI18n } from "../i18n/I18nContext";
import ProductImage from "./ProductImage";
import { Minus, Plus, Trash2, ShoppingCart, Loader2 } from "lucide-react";

interface Props {
  cart: CartItem[];
  onIncrement: (id: number) => void;
  onDecrement: (id: number) => void;
  onRemove: (id: number) => void;
  onCheckout: () => void;
  isCheckingOut: boolean;
}

export default function Cart({
  cart,
  onIncrement,
  onDecrement,
  onRemove,
  onCheckout,
  isCheckingOut,
}: Props) {
  const { t } = useI18n();
  const currency = t("currency");
  const fmt = (n: number) => Math.round(n).toLocaleString("de-DE");
  const total = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      {/* Desktop: full panel */}
      <div className="hidden xl:flex h-full max-h-[calc(100vh-6rem)] flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <ShoppingCart className="h-5 w-5 text-slate-400" />
          <h2 className="text-base font-bold text-slate-800">{t("cart")}</h2>
          {itemCount > 0 && (
            <span className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
              {itemCount}
            </span>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-10">
            <ShoppingCart className="mb-3 h-10 w-10 text-slate-200" />
            <p className="text-sm font-medium text-slate-400">{t("emptyCart")}</p>
            <p className="mt-1 text-xs text-slate-300">{t("addProductsHint")}</p>
          </div>
        ) : (
          <ul className="flex-1 divide-y divide-slate-50 overflow-y-auto px-2 scrollbar-thin">
            {cart.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3 px-2">
                <ProductImage product={item} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    {fmt(Number(item.price))} {currency} / {t("piece")}
                  </p>
                  <p className="text-sm font-bold text-slate-800">
                    {fmt(Number(item.price) * item.quantity)} {currency}
                  </p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onDecrement(item.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                    <button
                      onClick={() => onIncrement(item.id)}
                      disabled={item.quantity >= item.stock}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition hover:bg-slate-200 disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => onRemove(item.id)}
                    className="flex items-center gap-1 text-xs font-medium text-red-500 transition hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("remove")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-slate-100 px-4 py-4">
          <div className="mb-3 flex items-end justify-between">
            <span className="text-sm font-medium text-slate-500">{t("totalAmount")}</span>
            <span className="text-2xl font-extrabold text-slate-900">{fmt(total)} {currency}</span>
          </div>
          <button
            onClick={onCheckout}
            disabled={cart.length === 0 || isCheckingOut}
            className="btn-success flex w-full items-center justify-center gap-2"
          >
            {isCheckingOut ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t("processing")}
              </>
            ) : (
              <>
                <ShoppingCart className="h-5 w-5" />
                {t("checkout")}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mobile: sticky bottom bar with expandable cart */}
      <div className="xl:hidden fixed bottom-16 left-0 right-0 z-30 mx-auto max-w-md px-2">
        {cart.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-lg">
            {/* Collapsible items */}
            <ul className="max-h-36 divide-y divide-slate-50 overflow-y-auto scrollbar-thin">
              {cart.map((item) => (
                <li key={item.id} className="flex items-center gap-2 py-2 px-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      {fmt(Number(item.price) * item.quantity)} {currency}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onDecrement(item.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                    <button
                      onClick={() => onIncrement(item.id)}
                      disabled={item.quantity >= item.stock}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700 disabled:opacity-40"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onRemove(item.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {/* Total + checkout */}
            <div className="flex items-center gap-3 border-t border-slate-100 px-3 py-2.5">
              <div className="flex-1">
                <span className="text-xs text-slate-500">{itemCount} {t("piece")}</span>
                <p className="text-lg font-extrabold text-slate-900">{fmt(total)} {currency}</p>
              </div>
              <button
                onClick={onCheckout}
                disabled={isCheckingOut}
                className="btn-success px-5"
              >
                {isCheckingOut ? t("processing") : t("checkout")}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
