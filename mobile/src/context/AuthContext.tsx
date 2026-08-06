import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { getItemAsync, setItemAsync } from "../utils/secureStore";

// PIN storage note:
// expo-crypto is NOT installed in this project, so the PIN is stored directly
// in expo-secure-store, which is already hardware-encrypted at rest on-device
// (Keychain on iOS, Keystore-backed on Android). This is acceptable for a
// local 4-digit shop PIN. To harden later: `npx expo install expo-crypto`,
// then store a salted SHA-256 hash instead of the raw value.

const PIN_KEY = "pos_pin";
const SHOP_KEY = "pos_shop_name";

// Defaults seeded on first run. CHANGE THESE / add a settings screen later.
const DEFAULT_PIN = "1234";
const DEFAULT_SHOP_NAME = "Meine Boutique";

interface AuthValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  shopName: string;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [shopName, setShopName] = useState(DEFAULT_SHOP_NAME);

  useEffect(() => {
    (async () => {
      try {
        let storedPin = await getItemAsync(PIN_KEY);
        if (storedPin == null) {
          await setItemAsync(PIN_KEY, DEFAULT_PIN);
          storedPin = DEFAULT_PIN;
        }
        let storedShop = await getItemAsync(SHOP_KEY);
        if (storedShop == null) {
          await setItemAsync(SHOP_KEY, DEFAULT_SHOP_NAME);
          storedShop = DEFAULT_SHOP_NAME;
        }
        setShopName(storedShop);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function login(pin: string): Promise<boolean> {
    const storedPin = await getItemAsync(PIN_KEY);
    if (storedPin != null && pin === storedPin) {
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
      value={{ isAuthenticated, isLoading, shopName, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
