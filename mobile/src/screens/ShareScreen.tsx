import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { exportProducts, importProducts, shareApp } from "../utils/share";
import { formatCFA } from "../utils/format";
import { getProducts, Product } from "../db/queries";
import { useEffect } from "react";

export default function ShareScreen() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    (async () => {
      const p = await getProducts();
      setProducts(p);
    })();
  }, []);

  async function handleExport() {
    try {
      await exportProducts();
      Alert.alert("Erfolg", `${products.length} Produkte als Datei geteilt.`);
    } catch {
      Alert.alert("Fehler", "Export fehlgeschlagen.");
    }
  }

  async function handleImport() {
    try {
      const count = await importProducts();
      if (count > 0) {
        Alert.alert("Erfolg", `${count} Produkte importiert.`);
        const p = await getProducts();
        setProducts(p);
      }
    } catch {
      Alert.alert("Fehler", "Import fehlgeschlagen. Datei ungültig?");
    }
  }

  async function handleShareApp() {
    try {
      await shareApp();
    } catch {
      Alert.alert("Fehler", "Teilen fehlgeschlagen.");
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📤 Teilen</Text>
        <Text style={styles.headerSub}>
          App weitergeben oder Produktlisten austauschen
        </Text>
      </View>

      {/* App weitergeben */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>App an Kollegen senden</Text>
        <Text style={styles.cardDesc}>
          Gib die App an andere Händler weiter — komplett kostenlos, kein Internet nötig.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={handleShareApp}>
          <Text style={styles.btnText}>📤 App weitergeben</Text>
        </TouchableOpacity>
      </View>

      {/* Produktliste senden */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Produktliste senden</Text>
        <Text style={styles.cardDesc}>
          {products.length} Produkte bereit zum Teilen. Der Empfänger muss sie nicht einzeln eintippen.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={handleExport}>
          <Text style={styles.btnText}>📋 Produktliste senden</Text>
        </TouchableOpacity>
      </View>

      {/* Produktliste empfangen */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Produktliste empfangen</Text>
        <Text style={styles.cardDesc}>
          Empfange eine Produktliste von einem anderen Händler und füge sie zu deinem Lager hinzu.
        </Text>
        <TouchableOpacity style={styles.btnOutline} onPress={handleImport}>
          <Text style={styles.btnOutlineText}>📥 Produktliste empfangen</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  header: {
    backgroundColor: "#0f766e",
    padding: 24,
    alignItems: "center",
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  headerSub: { fontSize: 14, color: "#ccfbf1", marginTop: 4, textAlign: "center" },
  card: {
    backgroundColor: "#fff",
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: "#1f2937", marginBottom: 6 },
  cardDesc: { fontSize: 14, color: "#6b7280", marginBottom: 16, lineHeight: 20 },
  btn: {
    backgroundColor: "#0f766e",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  btnOutline: {
    borderWidth: 2,
    borderColor: "#0f766e",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
  },
  btnOutlineText: { color: "#0f766e", fontSize: 16, fontWeight: "bold" },
});
