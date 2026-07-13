import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as SecureStore from "../utils/secureStore";
import { getSetting, setSetting, seedDemoProducts } from "../db/queries";
import { shouldBackup, backupDatabase } from "../utils/backup";

interface AuthContextValue {
  shopName: string | null;
  isOnboarded: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  onboard: (name: string, pin: string) => Promise<void>;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SHOP_NAME_KEY = "shop_name";
const PIN_KEY = "pos_pin";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [shopName, setShopName] = useState<string | null>(null);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const name = await getSetting(SHOP_NAME_KEY);
      if (name) {
        setShopName(name);
        setIsOnboarded(true);
        // Auto-backup if >24h since last
        if (await shouldBackup()) {
          await backupDatabase().catch(() => {});
        }
      }
      setLoading(false);
    })();
  }, []);

  async function onboard(name: string, pin: string): Promise<void> {
    await setSetting(SHOP_NAME_KEY, name);
    await SecureStore.setItemAsync(PIN_KEY, pin);
    await seedDemoProducts();
    setShopName(name);
    setIsOnboarded(true);
    setIsAuthenticated(true);
  }

  async function login(pin: string): Promise<boolean> {
    const storedPin = await SecureStore.getItemAsync(PIN_KEY);
    if (storedPin === pin) {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }

  function logout() {
    setIsAuthenticated(false);
  }

  return (
    <AuthContext.Provider
      value={{ shopName, isOnboarded, isAuthenticated, loading, onboard, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
