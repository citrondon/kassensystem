import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import CustomerBookScreen from "./src/screens/CustomerBookScreen";
import DailySummaryScreen from "./src/screens/DailySummaryScreen";

const Tab = createBottomTabNavigator();

export default function App() {
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
