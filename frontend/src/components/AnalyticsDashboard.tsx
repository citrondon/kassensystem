import { useState, useEffect, useCallback } from "react";
import {
  AnalyticsSummary,
  StoreSummary,
  Bestseller,
  TrendPoint,
  LicenseKeyRow,
} from "../types";
import {
  getAnalyticsSummary,
  getBestsellers,
  getTrends,
  localSync,
  listLicenseKeys,
  createLicenseKey,
  updateLicenseKey,
} from "../services/api";
import { useI18n } from "../i18n/I18nContext";
import {
  BarChart3,
  Store,
  TrendingUp,
  Package,
  Loader2,
  RefreshCw,
  Crown,
  KeyRound,
  Plus,
  Ban,
  RotateCcw,
  CalendarPlus,
  Database,
  Copy,
  Check,
} from "lucide-react";

export default function AnalyticsDashboard() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [bestsellers, setBestsellers] = useState<Bestseller[]>([]);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const { t } = useI18n();

  // License management state
  const [keys, setKeys] = useState<LicenseKeyRow[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [newKeyPlan, setNewKeyPlan] = useState("trial");
  const [newKeyDays, setNewKeyDays] = useState(365);
  const [newKeyResult, setNewKeyResult] = useState("");
  const [copiedKey, setCopiedKey] = useState("");

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

  const loadKeys = useCallback(async () => {
    setKeysLoading(true);
    try {
      const res = await listLicenseKeys();
      setKeys(res.keys);
    } catch {
      // ignore
    } finally {
      setKeysLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadKeys();
  }, [load, loadKeys]);

  const fmt = (n: number) => Math.round(n).toLocaleString("de-DE");
  const currency = t("currency");
  const maxRevenue = Math.max(...trends.map((d) => Number(d.revenue)), 1);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg("");
    try {
      const res = await localSync();
      if (res.success) {
        setSyncMsg(`${res.synced} Tage synchronisiert.`);
        load();
      } else {
        setSyncMsg(res.message || "Sync fehlgeschlagen.");
      }
    } catch {
      setSyncMsg("Sync fehlgeschlagen.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleCreateKey() {
    setNewKeyResult("");
    try {
      const res = await createLicenseKey(newKeyPlan, newKeyDays);
      if (res.success) {
        setNewKeyResult(res.licenseKey);
        loadKeys();
      }
    } catch {
      setNewKeyResult("Fehler beim Erstellen.");
    }
  }

  async function handleKeyAction(key: string, action: "extend" | "cancel" | "reactivate", days?: number) {
    try {
      await updateLicenseKey(key, action, days);
      loadKeys();
    } catch {
      // ignore
    }
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(""), 2000);
  }

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
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn-secondary flex items-center gap-2"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            Local Sync
          </button>
          <button onClick={load} className="btn-secondary flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            {t("refresh")}
          </button>
        </div>
      </div>

      {syncMsg && (
        <p className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700">{syncMsg}</p>
      )}

      {/* Summary cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-4">
            <StatCard label="Aktive Stores" value={String(summary?.activeStores ?? 0)} icon={<Store className="h-6 w-6 text-indigo-600" />} bg="bg-indigo-50" />
            <StatCard label="Gesamt-Umsatz" value={`${fmt(summary?.totalRevenue ?? 0)} ${currency}`} icon={<TrendingUp className="h-6 w-6 text-emerald-600" />} bg="bg-emerald-50" />
            <StatCard label="Gesamt-Bestellungen" value={String(summary?.totalOrders ?? 0)} icon={<BarChart3 className="h-6 w-6 text-blue-600" />} bg="bg-blue-50" />
            <StatCard label="Gesamt-Rabatt" value={`${fmt(summary?.totalDiscount ?? 0)} ${currency}`} icon={<Package className="h-6 w-6 text-amber-600" />} bg="bg-amber-50" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Bestsellers */}
            <div className="panel p-5">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
                <Crown className="h-5 w-5 text-amber-500" />
                Top-Produkte (alle Stores)
              </h2>
              {bestsellers.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">Keine Daten. Klicke "Local Sync" um Bestellungen zu aggregieren.</p>
              ) : (
                <ul className="space-y-2">
                  {bestsellers.map((item, i) => (
                    <li key={item.product_name} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{item.product_name}</p>
                        <p className="text-xs text-slate-500">{item.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-800">{Number(item.total_quantity)}×</p>
                        <p className="text-xs text-slate-500">{fmt(Number(item.total_revenue))} {currency}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Trend chart */}
            <div className="panel p-5">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Umsatz-Trend (30 Tage)
              </h2>
              {trends.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">Keine Daten. Klicke "Local Sync".</p>
              ) : (
                <div className="flex h-48 items-end gap-1 overflow-x-auto">
                  {trends.map((d) => {
                    const pct = (Number(d.revenue) / maxRevenue) * 100;
                    return (
                      <div key={d.snapshot_date} className="group relative flex flex-1 flex-col items-center justify-end" style={{ minWidth: "8px" }}>
                        <div className="w-full rounded-t bg-gradient-to-t from-indigo-400 to-indigo-500 transition group-hover:from-indigo-500 group-hover:to-indigo-600" style={{ height: `${Math.max(pct, 2)}%` }} />
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

          {/* Store comparison */}
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
                        <td className="py-3 text-right font-bold text-slate-800">{fmt(Number(s.revenue))} {currency}</td>
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

      {/* ── License Key Management ── */}
      <div className="panel p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
          <KeyRound className="h-5 w-5 text-indigo-500" />
          Lizenzschlüssel-Verwaltung
        </h2>

        {/* Create new key */}
        <div className="mb-6 flex flex-wrap items-end gap-3 rounded-lg bg-slate-50 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Plan</label>
            <select
              value={newKeyPlan}
              onChange={(e) => setNewKeyPlan(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="trial">Trial</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Laufzeit (Tage)</label>
            <input
              type="number"
              value={newKeyDays}
              onChange={(e) => setNewKeyDays(Number(e.target.value))}
              className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <button onClick={handleCreateKey} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Key erstellen
          </button>
          {newKeyResult && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
              <span className="font-mono text-sm font-bold text-emerald-700">{newKeyResult}</span>
              <button onClick={() => { navigator.clipboard.writeText(newKeyResult); setCopiedKey(newKeyResult); setTimeout(() => setCopiedKey(""), 2000); }} className="text-emerald-600 hover:text-emerald-800">
                {copiedKey === newKeyResult ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>

        {/* Key list */}
        {keysLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : keys.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">Keine Lizenzschlüssel vorhanden.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="pb-2 pr-4">Lizenzschlüssel</th>
                  <th className="pb-2 pr-4">Plan</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Store</th>
                  <th className="pb-2 pr-4">Gültig bis</th>
                  <th className="pb-2 pr-4 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="border-b border-slate-50">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-700">{k.license_key}</span>
                        <button onClick={() => copyKey(k.license_key)} className="text-slate-400 hover:text-slate-600">
                          {copiedKey === k.license_key ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        k.plan === "pro" ? "bg-purple-100 text-purple-700" : k.plan === "basic" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                      }`}>
                        {k.plan}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        k.status === "active" ? "bg-emerald-100 text-emerald-700" :
                        k.status === "expired" ? "bg-red-100 text-red-700" :
                        k.status === "cancelled" ? "bg-slate-100 text-slate-500" : "bg-amber-100 text-amber-700"
                      }`}>
                        {k.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{k.store_name || "—"}</td>
                    <td className="py-3 pr-4 text-slate-500">{new Date(k.expires_at).toLocaleDateString("de-DE")}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center justify-end gap-1">
                        {k.status !== "cancelled" && (
                          <>
                            <button
                              onClick={() => handleKeyAction(k.license_key, "extend", 30)}
                              title="+30 Tage verlängern"
                              className="rounded p-1.5 text-indigo-600 hover:bg-indigo-50"
                            >
                              <CalendarPlus className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleKeyAction(k.license_key, "cancel")}
                              title="Kündigen"
                              className="rounded p-1.5 text-red-600 hover:bg-red-50"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {k.status === "cancelled" && (
                          <button
                            onClick={() => handleKeyAction(k.license_key, "reactivate", 30)}
                            title="Reaktivieren (+30 Tage)"
                            className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, bg }: { label: string; value: string; icon: React.ReactNode; bg: string }) {
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
