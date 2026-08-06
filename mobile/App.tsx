import { ActivityIndicator, View, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import PinLoginScreen from "./src/screens/PinLoginScreen";
import CustomerBookScreen from "./src/screens/CustomerBookScreen";
import DailySummaryScreen from "./src/screens/DailySummaryScreen";

const Tab = createBottomTabNavigator();

function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0f766e" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <PinLoginScreen />;
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: "#0f766e" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "bold" },
          tabBarActiveTintColor: "#0f766e",
          tabBarInactiveTintColor: "#9ca3af",
          tabBarLabelStyle: { fontSize: 13, fontWeight: "600" },
        }}
      >
        <Tab.Screen
          name="CustomerBook"
          component={CustomerBookScreen}
          options={{ title: "Kundenbuch" }}
        />
        <Tab.Screen
          name="DailySummary"
          component={DailySummaryScreen}
          options={{ title: "Tagesbericht" }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f3f4f6" },
});
