import { useState, useEffect, useCallback } from "react";
import { Product, CartItem, CheckoutResponse, Category, OrderDetail, PaymentMethod } from "../types";
import {
  getProducts,
  getCategories,
  checkout,
  getOrderById,
} from "../services/api";
import {
  syncProductsToCache,
  getProductsFromCache,
  savePendingOrder,
  syncPendingOrders,
  getPendingOrderCount,
  isOnline,
} from "../services/offline";
import { useI18n } from "../i18n/I18nContext";
import { getCategoryMeta, getCategoryLabel } from "../utils/categoryStyles";
import ProductList from "./ProductList";
import Cart from "./Cart";
import Scanner from "./Scanner";
import CheckoutModal from "./CheckoutModal";
import ReceiptModal from "./ReceiptModal";
import { Search, X, ScanBarcode, ChevronDown, ChevronUp, Wifi, WifiOff } from "lucide-react";

export default function CashierInterface() {
  const { t, lang } = useI18n();
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [receipt, setReceipt] = useState<OrderDetail | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [online, setOnline] = useState(isOnline());
  const [pendingCount, setPendingCount] = useState(0);

  // Track online/offline status
  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      syncPendingOrders().then((synced) => {
        if (synced > 0) {
          setNotification({ type: "success", message: t("ordersSynced", { count: synced }) });
          loadProducts();
        }
      });
      getPendingOrderCount().then(setPendingCount);
    };
    const goOffline = () => {
      setOnline(false);
      setNotification({ type: "error", message: t("offlineMode") });
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    getPendingOrderCount().then(setPendingCount);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [t]);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      if (isOnline()) {
        const data = await syncProductsToCache();
        // ponytail: server-side search/filter would be better, but client-side on cached set works for <500 products
        let filtered = data;
        if (searchTerm) {
          const q = searchTerm.toLowerCase();
          filtered = filtered.filter(
            (p) => p.name.toLowerCase().includes(q) || p.barcode?.includes(q)
          );
        }
        if (activeCategory) {
          filtered = filtered.filter((p) => p.category_id === activeCategory);
        }
        setProducts(filtered);
      } else {
        const cached = await getProductsFromCache();
        let filtered = cached;
        if (searchTerm) {
          const q = searchTerm.toLowerCase();
          filtered = filtered.filter(
            (p) => p.name.toLowerCase().includes(q) || p.barcode?.includes(q)
          );
        }
        if (activeCategory) {
          filtered = filtered.filter((p) => p.category_id === activeCategory);
        }
        setProducts(filtered);
      }
    } catch {
      // Fall back to cache if network fails
      try {
        const cached = await getProductsFromCache();
        setProducts(cached);
      } catch {
        setNotification({ type: "error", message: t("searchFailed") });
      }
    }
  }, [searchTerm, activeCategory, t]);

  useEffect(() => {
    const timer = setTimeout(loadProducts, 200);
    return () => clearTimeout(timer);
  }, [loadProducts]);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 3000);
    return () => clearTimeout(timer);
  }, [notification]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      if (product.stock <= 0) return prev;
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const increment = (id: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id && item.quantity < item.stock
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  const decrement = (id: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (id: number) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const handleScan = (barcode: string) => {
    const product = products.find((p) => p.barcode === barcode);
    if (product) {
      if (product.stock <= 0) {
        setNotification({ type: "error", message: t("productOutOfStock", { name: product.name }) });
        return;
      }
      addToCart(product);
      setNotification({ type: "success", message: t("productAdded", { name: product.name }) });
    } else {
      void getProducts(barcode).then((all) => {
        const found = all.find((p) => p.barcode === barcode);
        if (found) {
          if (found.stock <= 0) {
            setNotification({ type: "error", message: t("productOutOfStock", { name: found.name }) });
            return;
          }
          addToCart(found);
          setNotification({ type: "success", message: t("productAdded", { name: found.name }) });
        } else {
          setNotification({
            type: "error",
            message: t("productNotFound", { barcode }),
          });
        }
      }).catch(() => {
        setNotification({ type: "error", message: t("searchFailed") });
      });
    }
  };

  const handleStartCheckout = () => {
    if (cart.length === 0) return;
    setCheckoutModalOpen(true);
  };

  const handleCheckout = async (
    paymentMethod: PaymentMethod,
    amountTendered: number,
    discountAmount: number
  ) => {
    setCheckoutModalOpen(false);
    setIsCheckingOut(true);
    setNotification(null);
    const items = cart.map((item) => ({
      productId: item.id,
      quantity: item.quantity,
    }));
    try {
      if (isOnline()) {
        const result: CheckoutResponse = await checkout(
          items,
          paymentMethod,
          amountTendered,
          discountAmount
        );
        if (result.success && result.orderId) {
          setNotification({ type: "success", message: result.message });
          setCart([]);
          loadProducts();
          try {
            const detail = await getOrderById(result.orderId);
            setReceipt(detail);
          } catch {
            // Receipt optional
          }
        } else {
          setNotification({
            type: "error",
            message: result.error || t("checkoutFailed"),
          });
          loadProducts();
        }
      } else {
        // Offline: save to IndexedDB, sync later
        await savePendingOrder(
          items,
          paymentMethod,
          amountTendered,
          discountAmount
        );
        const count = await getPendingOrderCount();
        setPendingCount(count);
        setNotification({
          type: "success",
          message: t("orderSavedOffline", { count }),
        });
        setCart([]);
      }
    } catch {
      // Network failed mid-checkout — save offline
      try {
        await savePendingOrder(
          items,
          paymentMethod,
          amountTendered,
          discountAmount
        );
        const count = await getPendingOrderCount();
        setPendingCount(count);
        setNotification({
          type: "success",
          message: t("orderSavedOffline", { count }),
        });
        setCart([]);
      } catch {
        setNotification({ type: "error", message: t("networkError") });
      }
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800">{t("cashier")}</h1>
          <span
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
              online
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}
          >
            {online ? (
              <>
                <Wifi className="h-3.5 w-3.5" />
                {t("online")}
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5" />
                {t("offline")}
              </>
            )}
          </span>
          {pendingCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200">
              {pendingCount} {t("pendingOrders")}
            </span>
          )}
        </div>
        {notification && (
          <div
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm ${
              notification.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {notification.message}
            <button
              onClick={() => setNotification(null)}
              className="ml-1 rounded-md p-0.5 hover:bg-black/5"
              aria-label={t("close")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[260px_1fr_340px]">
        {/* Linke Spalte: Suche, Kategorien, Scanner */}
        <div className="space-y-4">
          <div className="panel p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t("searchProduct")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t("categories")}
              </p>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => setActiveCategory(null)}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition"
                  style={
                    activeCategory === null
                      ? { background: "#EEF2FF", color: "#4F46E5" }
                      : undefined
                  }
                >
                  <span className="flex items-center gap-2">
                    <span>🏪</span> {t("all")}
                  </span>
                  {activeCategory === null && (
                    <span className="h-2 w-2 rounded-full bg-indigo-600" />
                  )}
                </button>
                {categories.map((cat) => {
                  const meta = getCategoryMeta(cat.name);
                  const label = getCategoryLabel(cat.name, lang);
                  const isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition"
                      style={
                        isActive
                          ? {
                              background: meta.bg,
                              color: meta.color,
                              border: `1px solid ${meta.border}`,
                            }
                          : undefined
                      }
                      title={`${meta.emoji} ${label}`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{meta.emoji}</span>
                        <span style={!isActive ? { color: meta.color } : undefined}>
                          {label}
                        </span>
                      </span>
                      {isActive && (
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: meta.color }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

              <div className="border-t border-slate-100 pt-3">
              <button
                onClick={() => setScannerOpen((v) => !v)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <span className="flex items-center gap-2">
                  <ScanBarcode className="h-5 w-5" />
                  {t("scanBarcode")}
                </span>
                {scannerOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {scannerOpen && (
                <div className="mt-2">
                  <Scanner onScan={handleScan} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mittlere Spalte: Produkte */}
        <div>
          <ProductList products={products} onAdd={addToCart} />
        </div>

        {/* Rechte Spalte: Warenkorb */}
        <div className="xl:sticky xl:top-4 xl:self-start">
          <Cart
            cart={cart}
            onIncrement={increment}
            onDecrement={decrement}
            onRemove={removeItem}
            onCheckout={handleStartCheckout}
            isCheckingOut={isCheckingOut}
          />
        </div>
      </div>

      <CheckoutModal
        cart={cart}
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        onCheckout={handleCheckout}
        isCheckingOut={isCheckingOut}
      />

      {receipt && <ReceiptModal order={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}
