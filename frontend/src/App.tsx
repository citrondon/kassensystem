import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LicenseProvider, useLicense } from "./contexts/LicenseContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Sidebar from "./components/Sidebar";
import MobileNav from "./components/MobileNav";
import Dashboard from "./components/Dashboard";
import CashierInterface from "./components/CashierInterface";
import InventoryOverview from "./components/InventoryOverview";
import OrdersView from "./components/OrdersView";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import StoreDetailView from "./components/StoreDetailView";
import LoginView from "./components/LoginView";
import LicenseActivation from "./components/LicenseActivation";
import SetupView from "./components/SetupView";
import Header from "./components/Header";
import SettingsPanel from "./components/SettingsPanel";

type View = "dashboard" | "cashier" | "inventory" | "orders" | "analytics" | "store-detail";

function AppContent() {
  const [view, setView] = useState<View>("dashboard");
  const [selectedStore, setSelectedStore] = useState<{ id: number; name: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const { user, loading } = useAuth();
  const { state: licenseState } = useLicense();

  // Hash-based store detail navigation
  useEffect(() => {
    const handleHash = () => {
      const match = window.location.hash.match(/^#store-(\d+)$/);
      if (match) {
        const storeId = Number(match[1]);
        // Find store name from current state if possible, else use ID
        setSelectedStore((prev) => (prev?.id === storeId ? prev : { id: storeId, name: `Store ${storeId}` }));
        setView("store-detail");
      } else if (view === "store-detail") {
        setView("analytics");
      }
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  // Check if setup is needed (no users exist)
  useEffect(() => {
    if (licenseState === "active" || licenseState === "offline-grace") {
      if (!user && !loading) {
        fetch("/api/auth/setup-status")
          .then((r) => r.json())
          .then((data) => {
            if (data.success && data.needsSetup) {
              setNeedsSetup(true);
            }
          })
          .catch(() => {});
      }
    }
  }, [licenseState, user, loading]);

  // License gate
  if (licenseState === "checking" || licenseState === "none" || licenseState === "expired") {
    return <LicenseActivation />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  // Setup needed → show setup screen
  if (needsSetup && !user) {
    return <SetupView />;
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Header onOpenSettings={() => setShowSettings(true)} />
      <Sidebar active={view === "store-detail" ? "analytics" : view} onChange={setView} />
      <div className="p-3 pb-28 pt-16 lg:ml-64 lg:p-6 lg:pb-6 lg:pt-16">
        <main className="mx-auto w-full max-w-[1440px]">
          {view === "dashboard" && <Dashboard onNavigate={setView} />}
          {view === "cashier" && <CashierInterface />}
          {view === "inventory" && <InventoryOverview />}
          {view === "orders" && <OrdersView />}
          {view === "analytics" && <AnalyticsDashboard onSelectStore={(id, name) => { setSelectedStore({ id, name }); setView("store-detail"); }} />}
          {view === "store-detail" && selectedStore && <StoreDetailView storeId={selectedStore.id} storeName={selectedStore.name} onBack={() => setView("analytics")} />}
        </main>
      </div>
      <MobileNav active={view === "store-detail" ? "analytics" : view} onChange={setView} />
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LicenseProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LicenseProvider>
    </ThemeProvider>
  );
}
