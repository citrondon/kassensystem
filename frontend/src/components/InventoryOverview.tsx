import { useState, useEffect, useCallback } from "react";
import { Product, Category } from "../types";
import { getProducts, getCategories, deleteProduct } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../i18n/I18nContext";
import ProductImage from "./ProductImage";
import ProductFormModal from "./ProductFormModal";
import Scanner from "./Scanner";
import {
  AlertTriangle,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Package,
  ScanBarcode,
} from "lucide-react";
import { getCategoryMeta, getCategoryLabel } from "../utils/categoryStyles";

export default function InventoryOverview() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [filterCategory, setFilterCategory] = useState<number | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | undefined>(undefined);
  const { user } = useAuth();
  const isManager = user?.role === "manager";
  const { t, lang } = useI18n();
  const currency = t("currency");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [productData, catData] = await Promise.all([
        getProducts(),
        getCategories(),
      ]);
      setProducts(productData);
      setCategories(catData);
    } catch {
      setError(t("errorLoading"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaved = () => {
    setShowForm(false);
    setEditingProduct(null);
    setScannedBarcode(undefined);
    load();
  };

  const handleScan = (barcode: string) => {
    const found = products.find((p) => p.barcode === barcode);
    if (found) {
      setEditingProduct(found);
      setScannedBarcode(undefined);
    } else {
      setEditingProduct(null);
      setScannedBarcode(barcode);
    }
    setShowForm(true);
    setScannerOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProduct(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveError"));
      setDeleteTarget(null);
    }
  };

  const isLowStock = (p: Product) =>
    p.stock > 0 && p.stock <= p.low_stock_threshold;

  const filtered = products.filter((p) => {
    if (showLowStockOnly && !isLowStock(p) && p.stock !== 0) return false;
    if (filterCategory !== null && p.category_id !== filterCategory) return false;
    return true;
  });

  const totalValue = products.reduce(
    (sum, p) => sum + Number(p.price) * p.stock,
    0
  );
  const fmt = (n: number) => Math.round(n).toLocaleString("de-DE");

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Package className="mb-3 h-10 w-10 animate-bounce text-slate-300" />
        <p className="text-sm font-medium text-slate-400">{t("loadingInventory")}</p>
      </div>
    );
  }

  if (error && products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-red-600 font-medium">{error}</p>
        <button
          onClick={load}
          className="mt-3 btn-primary"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t("inventory")}</h1>
          {isManager && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("inventoryValue")}: {fmt(totalValue)} {currency} · {products.length} {t("totalItems")}
            </p>
          )}
        </div>
        {isManager && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setScannerOpen((v) => !v)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                scannerOpen
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <ScanBarcode className="h-5 w-5" />
              {t("scanBarcode")}
            </button>
            <button
              onClick={() => {
                setEditingProduct(null);
                setScannedBarcode(undefined);
                setShowForm(true);
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              {t("newProduct")}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">
          {error}
        </div>
      )}

      {scannerOpen && isManager && (
        <div className="panel p-4">
          <Scanner onScan={handleScan} />
        </div>
      )}

      <div className="panel">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-700">
          <button
            onClick={() => setShowLowStockOnly((v) => !v)}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
              showLowStockOnly
                ? "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            {t("lowStockFilter")}
          </button>

          <div className="relative">
            <select
              value={filterCategory ?? ""}
              onChange={(e) =>
                setFilterCategory(e.target.value ? Number(e.target.value) : null)
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">{t("allCategories")}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={load}
            className="ml-auto flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <RefreshCw className="h-4 w-4" />
            {t("refresh")}
          </button>
        </div>

        <div className="overflow-x-auto hidden lg:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3">{t("image")}</th>
                <th className="px-5 py-3">{t("product")}</th>
                <th className="px-5 py-3">{t("barcode")}</th>
                <th className="px-5 py-3">{t("category")}</th>
                <th className="px-5 py-3 text-right">{t("price")}</th>
                <th className="px-5 py-3 text-right">{t("costPrice")}</th>
                <th className="px-5 py-3 text-right">{t("stock")}</th>
                <th className="px-5 py-3 text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-400">
                    {t("noProductsFound")}
                  </td>
                </tr>
              ) : (
                filtered.map((product) => (
                  <tr key={product.id} className="transition hover:bg-slate-50/50 dark:hover:bg-slate-700/40">
                    <td className="px-5 py-3">
                      <ProductImage product={product} size="sm" />
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-100">
                      {product.name}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {product.barcode || "-"}
                    </td>
                    <td className="px-5 py-3">
                      {product.category_name ? (
                        (() => {
                          const meta = getCategoryMeta(product.category_name);
                          return (
                            <span
                              className="badge"
                              style={{
                                background: meta.bg,
                                color: meta.color,
                                border: `1px solid ${meta.border}`,
                              }}
                              title={`${meta.emoji} ${getCategoryLabel(product.category_name, lang)}`}
                            >
                              <span className="mr-1">{meta.emoji}</span>
                              {getCategoryLabel(product.category_name, lang)}
                            </span>
                          );
                        })()
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-slate-800 dark:text-slate-100">
                      {fmt(Number(product.price))} {currency}
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-slate-500 dark:text-slate-400">
                      {fmt(Number(product.cost_price))} {currency}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={`font-bold ${
                          product.stock === 0
                            ? "text-red-600"
                            : isLowStock(product)
                              ? "text-amber-600"
                              : "text-emerald-600"
                        }`}
                      >
                        {product.stock}
                      </span>
                      {isLowStock(product) && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                          !
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {isManager ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingProduct(product);
                              setShowForm(true);
                            }}
                            className="flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            {t("edit")}
                          </button>
                          <button
                            onClick={() => setDeleteTarget(product)}
                            className="flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {t("delete")}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">{t("readOnly")}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile: card layout */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
          {filtered.length === 0 ? (
            <div className="col-span-full py-10 text-center text-slate-400">
              {t("noProductsFound")}
            </div>
          ) : (
            filtered.map((product) => (
              <div key={product.id} className="panel p-3 flex gap-3">
                <ProductImage product={product} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-slate-800 truncate dark:text-slate-100">{product.name}</p>
                    {isLowStock(product) && (
                      <span className="flex-shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">!</span>
                    )}
                  </div>
                  {product.barcode && (
                    <p className="text-xs font-mono text-slate-400">{product.barcode}</p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-sm">
                    <span className="font-bold text-slate-800 dark:text-slate-100">{fmt(Number(product.price))} {currency}</span>
                    <span className="text-xs text-slate-400">· {t("costPrice")}: {fmt(Number(product.cost_price))}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className={`text-sm font-bold ${
                      product.stock === 0
                        ? "text-red-600"
                        : isLowStock(product)
                          ? "text-amber-600"
                          : "text-emerald-600"
                    }`}>
                      {t("stock")}: {product.stock}
                    </span>
                    {isManager ? (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => { setEditingProduct(product); setShowForm(true); }}
                          className="rounded-lg bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(product)}
                          className="rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">{t("readOnly")}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showForm && (
        <ProductFormModal
          product={editingProduct}
          categories={categories}
          initialBarcode={scannedBarcode}
          onClose={() => {
            setShowForm(false);
            setEditingProduct(null);
            setScannedBarcode(undefined);
          }}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-center text-lg font-bold text-slate-800 dark:text-slate-100">{t("deleteConfirm")}</h3>
            <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-300">
              {t("deleteWarning", { name: deleteTarget.name })}
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 rounded-xl bg-red-600 py-2.5 font-semibold text-white transition hover:bg-red-700"
              >
                {t("delete")}
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
