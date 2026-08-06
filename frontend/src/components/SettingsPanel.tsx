import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getStoredToken } from "../contexts/AuthContext";
import { useI18n } from "../i18n/I18nContext";
import { API_BASE } from "../services/api";
import { X, UserPlus, Trash2, Loader2, Tag, Plus, Languages } from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher";
import { getActiveVersion } from "../services/ota";
import { getCategories, createCategory, deleteCategory } from "../services/api";
import { getCategoryLabel } from "../utils/categoryStyles";
import type { Category } from "../types";

interface UserRow {
  id: number;
  username: string;
  role: string;
  created_at: string;
}

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("cashier");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Kategorien-Verwaltung (Manager-only)
  const isManager = user?.role === "manager" || user?.role === "developer";
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [catLoading, setCatLoading] = useState(false);

  // App-Version (OTA-Bundle) anzeigen
  const [appVersion, setAppVersion] = useState("…");
  useEffect(() => {
    let cancelled = false;
    getActiveVersion().then((v) => {
      if (!cancelled) setAppVersion(v);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/users`, { headers: { Authorization: `Bearer ${getStoredToken()}` } });
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const loadCategories = useCallback(async () => {
    setCatLoading(true);
    try {
      const cats = await getCategories();
      setCategories(cats);
    } catch {
      // ignore
    } finally {
      setCatLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isManager) loadCategories();
  }, [isManager, loadCategories]);

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;
    setError(""); setSuccess("");
    try {
      const cat = await createCategory(name);
      setSuccess(t("categoryCreated").replace("{name}", name));
      setNewCategoryName("");
      setCategories((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("categoryCreateFailed"));
    }
  }

  async function handleDeleteCategory(id: number, name: string) {
    if (!confirm(t("categoryDeleteConfirm").replace("{name}", getCategoryLabel(name, lang)))) return;
    setError(""); setSuccess("");
    try {
      await deleteCategory(id);
      setSuccess(t("categoryDeleted").replace("{name}", getCategoryLabel(name, lang)));
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("categoryCreateFailed"));
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    try {
      const res = await fetch(`${API_BASE}/auth/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getStoredToken()}` },
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error || t("createFailed")); return; }
      setSuccess(t("userCreated").replace("{name}", newUsername));
      setNewUsername(""); setNewPassword(""); loadUsers();
    } catch { setError(t("networkErrorGeneric")); }
  }

  async function handleDelete(id: number, username: string) {
    if (!confirm(t("deleteConfirmUser").replace("{name}", username))) return;
    setError(""); setSuccess("");
    try {
      const res = await fetch(`${API_BASE}/auth/users/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getStoredToken()}` } });
      const data = await res.json();
      if (!data.success) { setError(data.error || t("deleteFailed")); return; }
      setSuccess(t("userDeleted").replace("{name}", username));
      loadUsers();
    } catch { setError(t("networkErrorGeneric")); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t("settings")}</h2>
          <button onClick={onClose} className="btn-icon"><X className="h-5 w-5" /></button>
        </div>

        {/* Sprache — aus dem Header hierher verlagert, damit oben Platz bleibt */}
        <div className="mb-6 flex items-center justify-between rounded-lg bg-slate-50 p-4 dark:bg-slate-900/50">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
            <Languages className="h-4 w-4" />{t("language")}
          </h3>
          <LanguageSwitcher />
        </div>

        <div className="mb-6 rounded-lg bg-slate-50 p-4 dark:bg-slate-900/50">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
            <UserPlus className="h-4 w-4" />{t("newUser")}
          </h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder={t("usernamePlaceholder")} className="input" required />
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t("passwordPlaceholder")} className="input" required />
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{t("role")}</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="select">
                  <option value="cashier">{t("cashierRoleLabel")}</option>
                  <option value="manager">{t("managerRoleLabel")}</option>
                </select>
              </div>
              <button type="submit" className="btn-primary"><UserPlus className="h-4 w-4" />{t("createButton")}</button>
            </div>
          </form>
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</p>}
        {success && <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{success}</p>}

        {/* Kategorien-Verwaltung — Manager-only */}
        {isManager && (
          <div className="mb-6 rounded-lg bg-slate-50 p-4 dark:bg-slate-900/50">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
              <Tag className="h-4 w-4" />{t("categoriesManage")}
            </h3>
            <form onSubmit={handleCreateCategory} className="mb-3 flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={t("categoryNamePlaceholder")}
                maxLength={100}
                className="input flex-1"
                required
              />
              <button type="submit" className="btn-primary flex items-center gap-1.5 whitespace-nowrap">
                <Plus className="h-4 w-4" />{t("categoryCreate")}
              </button>
            </form>
            {catLoading ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <span
                    key={cat.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  >
                    {getCategoryLabel(cat.name, lang)}
                    <button
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      className="text-slate-400 transition hover:text-red-600"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {categories.length === 0 && (
                  <p className="text-xs text-slate-400">—</p>
                )}
              </div>
            )}
          </div>
        )}

        <h3 className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">{t("userOverview")}</h3>
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <div>
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{u.username}</span>
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                    u.role === "developer" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" :
                    u.role === "manager" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" :
                    "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                  }`}>
                    {u.role === "developer" ? "Developer" : u.role === "manager" ? t("managerRoleLabel") : t("cashierRoleLabel")}
                  </span>
                </div>
                {u.id !== user?.id && (
                  <button onClick={() => handleDelete(u.id, u.username)} className="rounded p-1.5 text-red-600 transition hover:bg-red-50 dark:hover:bg-red-900/30">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 border-t border-slate-200 pt-3 text-center text-xs text-slate-400 dark:border-slate-700">
          Version {appVersion}
        </p>
      </div>
    </div>
  );
}
