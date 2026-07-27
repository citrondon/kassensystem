import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LicenseProvider, useLicense } from "./contexts/LicenseContext";
import Sidebar from "./components/Sidebar";
import MobileNav from "./components/MobileNav";
import Dashboard from "./components/Dashboard";
import CashierInterface from "./components/CashierInterface";
import InventoryOverview from "./components/InventoryOverview";
import OrdersView from "./components/OrdersView";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import LoginView from "./components/LoginView";
import LicenseActivation from "./components/LicenseActivation";
import Header from "./components/Header";

type View = "dashboard" | "cashier" | "inventory" | "orders" | "analytics";

function AppContent() {
  const [view, setView] = useState<View>("dashboard");
  const { user, loading } = useAuth();
  const { state: licenseState } = useLicense();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [view]);

  // License gate: checking or none → show activation
  if (licenseState === "checking" || licenseState === "none") {
    return <LicenseActivation />;
  }

  // License expired → show expired screen (but still allow offline-grace)
  if (licenseState === "expired") {
    return <LicenseActivation />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Sidebar active={view} onChange={setView} />
      <div className="p-3 pb-20 pt-16 lg:ml-64 lg:p-6 lg:pb-6 lg:pt-16">
        <main className="mx-auto w-full max-w-[1440px]">
          {view === "dashboard" && <Dashboard onNavigate={setView} />}
          {view === "cashier" && <CashierInterface />}
          {view === "inventory" && <InventoryOverview />}
          {view === "orders" && <OrdersView />}
          {view === "analytics" && <AnalyticsDashboard />}
        </main>
      </div>
      <MobileNav active={view} onChange={setView} />
    </div>
  );
}

export default function App() {
  return (
    <LicenseProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LicenseProvider>
  );
}
