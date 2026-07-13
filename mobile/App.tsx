import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import PinLoginScreen from "./src/screens/PinLoginScreen";
import CashierScreen from "./src/screens/CashierScreen";
import InventoryScreen from "./src/screens/InventoryScreen";
import CustomerBookScreen from "./src/screens/CustomerBookScreen";
import DailySummaryScreen from "./src/screens/DailySummaryScreen";
import HistoryScreen from "./src/screens/HistoryScreen";

const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#0f766e",
        tabBarInactiveTintColor: "#9ca3af",
        headerStyle: { backgroundColor: "#0f766e" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
      }}
    >
      <Tab.Screen
        name="Verkauf"
        component={CashierScreen}
        options={{ title: "🛒 Verkauf" }}
      />
      <Tab.Screen
        name="Lager"
        component={InventoryScreen}
        options={{ title: "📦 Lager" }}
      />
      <Tab.Screen
        name="Historie"
        component={HistoryScreen}
        options={{ title: "📜 Historie" }}
      />
      <Tab.Screen
        name="Kundenbuch"
        component={CustomerBookScreen}
        options={{ title: "📒 Kunden" }}
      />
      <Tab.Screen
        name="Tagesbilanz"
        component={DailySummaryScreen}
        options={{ title: "📊 Bilanz" }}
      />
    </Tab.Navigator>
  );
}

function AppGate() {
  const { loading, isOnboarded, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#0f766e" />
      </View>
    );
  }

  if (!isOnboarded) return <OnboardingScreen />;
  if (!isAuthenticated) return <PinLoginScreen />;
  return <MainTabs />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <AppGate />
          <StatusBar style="light" />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
  },
});
