import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { hasBackups, listBackups, restoreFromBackup } from "../utils/backup";

export default function OnboardingScreen() {
  const { onboard } = useAuth();
  const [shopName, setShopName] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [backups, setBackups] = useState<{ uri: string; date: string }[]>([]);

  useEffect(() => {
    (async () => {
      if (await hasBackups()) {
        setBackups(await listBackups());
      }
    })();
  }, []);

  async function handleRestore(uri: string, date: string) {
    Alert.alert(
      "Backup wiederherstellen?",
      `Daten vom ${date} wiederherstellen?`,
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Wiederherstellen",
          onPress: async () => {
            const ok = await restoreFromBackup(uri);
            if (ok) {
              Alert.alert("Erfolg", "Backup wiederhergestellt. Bitte App neu starten.");
            } else {
              Alert.alert("Fehler", "Backup konnte nicht wiederhergestellt werden.");
            }
          },
        },
      ]
    );
  }

  function handleFinish() {
    if (!shopName.trim()) {
      Alert.alert("Fehler", "Bitte Geschäftsnamen eingeben.");
      return;
    }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      Alert.alert("Fehler", "PIN muss 4 Ziffern sein.");
      return;
    }
    if (pin !== pinConfirm) {
      Alert.alert("Fehler", "PINs stimmen nicht überein.");
      return;
    }
    onboard(shopName.trim(), pin);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Willkommen!</Text>
      <Text style={styles.subtitle}>Richte deine Kasse ein</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Geschäftsname</Text>
        <TextInput
          style={styles.input}
          placeholder="z.B. Boutique Akpédjé"
          value={shopName}
          onChangeText={setShopName}
          autoCapitalize="words"
        />

        <Text style={styles.label}>4-stellige PIN</Text>
        <TextInput
          style={styles.input}
          placeholder="••••"
          value={pin}
          onChangeText={setPin}
          keyboardType="numeric"
          maxLength={4}
          secureTextEntry
        />

        <Text style={styles.label}>PIN bestätigen</Text>
        <TextInput
          style={styles.input}
          placeholder="••••"
          value={pinConfirm}
          onChangeText={setPinConfirm}
          keyboardType="numeric"
          maxLength={4}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleFinish}>
          <Text style={styles.buttonText}>Kasse einrichten</Text>
        </TouchableOpacity>

        {backups.length > 0 && (
          <View style={styles.restoreSection}>
            <Text style={styles.restoreTitle}>📦 Backup verfügbar</Text>
            <Text style={styles.restoreHint}>
              Daten von anderem Gerät wiederherstellen:
            </Text>
            {backups.slice(0, 3).map((b) => (
              <TouchableOpacity
                key={b.uri}
                style={styles.restoreBtn}
                onPress={() => handleRestore(b.uri, b.date)}
              >
                <Text style={styles.restoreBtnText}>Restore: {b.date}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f766e",
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 18,
    color: "#ccfbf1",
    marginBottom: 40,
  },
  form: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 14,
    fontSize: 18,
    backgroundColor: "#f9fafb",
  },
  button: {
    backgroundColor: "#0f766e",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  restoreSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "#f0fdfa",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#0f766e",
  },
  restoreTitle: { fontSize: 16, fontWeight: "bold", color: "#0f766e", marginBottom: 4 },
  restoreHint: { fontSize: 13, color: "#374151", marginBottom: 10 },
  restoreBtn: {
    backgroundColor: "#0f766e",
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    alignItems: "center",
  },
  restoreBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
