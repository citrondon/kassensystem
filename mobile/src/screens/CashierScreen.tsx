import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
} from "react-native";
import { getProducts, checkout, Product, CheckoutItem } from "../db/queries";
import { formatCFA } from "../utils/format";

interface CartEntry extends Product {
  quantity: number;
}

export default function CashierScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [customAmount, setCustomAmount] = useState("");
  const [search, setSearch] = useState("");
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [amountTendered, setAmountTendered] = useState("");
  const [discount, setDiscount] = useState("");
  const [resultModal, setResultModal] = useState<{ change: number; total: number } | null>(null);
  const [qtyProduct, setQtyProduct] = useState<Product | null>(null);
  const [qtyValue, setQtyValue] = useState("1");

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    const prods = await getProducts();
    setProducts(prods);
  }

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountAmount = discount ? parseInt(discount, 10) || 0 : 0;
  const grandTotal = cartTotal - discountAmount;

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  function openQtyPopup(product: Product) {
    setQtyProduct(product);
    setQtyValue("1");
  }

  function confirmQty() {
    if (!qtyProduct) return;
    const qty = parseInt(qtyValue, 10) || 1;
    if (qty < 1) return;
    addProductToCart(qtyProduct, qty);
    setQtyProduct(null);
    setQtyValue("1");
  }

  function addProductToCart(product: Product, qty: number) {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + qty } : i
        );
      }
      return [...prev, { ...product, quantity: qty }];
    });
  }

  function addCustomItem() {
    const amount = parseInt(customAmount, 10);
    if (!amount || amount <= 0) return;
    const dummyProduct: CartEntry = {
      id: 0,
      name: `Sonderbetrag: ${formatCFA(amount)}`,
      price: amount,
      stock: 0,
      category: null,
      low_stock_threshold: 0,
      quantity: 1,
    };
    setCart((prev) => [...prev, dummyProduct]);
    setCustomAmount("");
  }

  function changeQty(id: number, delta: number) {
    setCart((prev) =>
      prev
        .map((i) =>
          i.id === id ? { ...i, quantity: i.quantity + delta } : i
        )
        .filter((i) => i.quantity > 0)
    );
  }

  function removeFromCart(id: number, name: string) {
    if (id === 0) {
      setCart((prev) => prev.filter((i) => i.name !== name));
    } else {
      setCart((prev) => prev.filter((i) => i.id !== id));
    }
  }

  function openCheckout() {
    if (cart.length === 0) {
      Alert.alert("Warenkorb leer", "Füge Produkte hinzu.");
      return;
    }
    setAmountTendered("");
    setDiscount("");
    setCheckoutModal(true);
  }

  async function doCheckout() {
    const tendered = parseInt(amountTendered, 10) || 0;
    if (tendered < grandTotal) {
      Alert.alert("Zu wenig", `Kunde muss mindestens ${formatCFA(grandTotal)} geben.`);
      return;
    }

    const items: CheckoutItem[] = cart.map((i) => ({
      productId: i.id,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
    }));

    const result = await checkout(items, tendered, discountAmount);
    setCheckoutModal(false);
    setResultModal({ change: result.changeAmount, total: grandTotal });
    setCart([]);
    setDiscount("");
    await loadProducts();
  }

  return (
    <View style={styles.container}>
      {/* Suchleiste + Sonderbetrag */}
      <View style={styles.topBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Produkt suchen..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Produktkacheln */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.productGrid}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.productTile}
            onPress={() => openQtyPopup(item)}
          >
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.productPrice}>{formatCFA(item.price)}</Text>
            {item.stock > 0 && (
              <Text style={styles.productStock}>Stock: {item.stock}</Text>
            )}
          </TouchableOpacity>
        )}
      />

      {/* Sonderbetrag-Eingabe */}
      <View style={styles.customRow}>
        <TextInput
          style={styles.customInput}
          placeholder="Sonderbetrag (CFA)"
          keyboardType="numeric"
          value={customAmount}
          onChangeText={setCustomAmount}
        />
        <TouchableOpacity style={styles.customBtn} onPress={addCustomItem}>
          <Text style={styles.customBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Warenkorb */}
      {cart.length > 0 && (
        <View style={styles.cartContainer}>
          <Text style={styles.cartTitle}>
            Warenkorb — {formatCFA(cartTotal)}
          </Text>
          {cart.map((item) => (
            <View key={`${item.id}-${item.name}`} style={styles.cartRow}>
              <Text style={styles.cartItemName} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.qtyControls}>
                <TouchableOpacity onPress={() => changeQty(item.id, -1)}>
                  <Text style={styles.qtyBtn}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <TouchableOpacity onPress={() => changeQty(item.id, 1)}>
                  <Text style={styles.qtyBtn}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeFromCart(item.id, item.name)}>
                  <Text style={styles.removeBtn}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.cartLineTotal}>
                {formatCFA(item.price * item.quantity)}
              </Text>
            </View>
          ))}

          <TouchableOpacity style={styles.checkoutBtn} onPress={openCheckout}>
            <Text style={styles.checkoutBtnText}>Berechnen — {formatCFA(cartTotal)}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Checkout Modal */}
      <Modal visible={checkoutModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Checkout</Text>
            <Text style={styles.modalTotal}>Gesamt: {formatCFA(grandTotal)}</Text>

            <Text style={styles.modalLabel}>Rabatt (CFA)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="0"
              keyboardType="numeric"
              value={discount}
              onChangeText={setDiscount}
            />

            <Text style={styles.modalLabel}>Kunde gibt (CFA)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={grandTotal.toString()}
              keyboardType="numeric"
              value={amountTendered}
              onChangeText={setAmountTendered}
              autoFocus
            />

            {amountTendered !== "" && (
              <Text style={styles.modalChange}>
                Zurück: {formatCFA((parseInt(amountTendered, 10) || 0) - grandTotal)}
              </Text>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setCheckoutModal(false)}
              >
                <Text style={styles.modalCancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={doCheckout}>
                <Text style={styles.modalConfirmText}>Bestätigen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Mengen-Pop-up Modal */}
      <Modal visible={qtyProduct !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.qtyContent}>
            <Text style={styles.qtyTitle}>{qtyProduct?.name}</Text>
            <Text style={styles.qtyPrice}>{formatCFA(qtyProduct?.price ?? 0)} pro Einheit</Text>
            <Text style={styles.qtyLabel}>Wie viele Einheiten?</Text>
            <TextInput
              style={styles.qtyInput}
              value={qtyValue}
              onChangeText={setQtyValue}
              keyboardType="numeric"
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.qtyQuickRow}>
              {[1, 2, 3, 5, 10].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={styles.qtyQuickBtn}
                  onPress={() => setQtyValue(n.toString())}
                >
                  <Text style={styles.qtyQuickText}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setQtyProduct(null);
                  setQtyValue("1");
                }}
              >
                <Text style={styles.modalCancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={confirmQty}>
                <Text style={styles.modalConfirmText}>In Warenkorb</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Ergebnis Modal */}
      <Modal visible={resultModal !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.resultContent}>
            <Text style={styles.resultTitle}>Verkauf abgeschlossen!</Text>
            <Text style={styles.resultTotal}>
              Gesamt: {formatCFA(resultModal?.total ?? 0)}
            </Text>
            <Text style={styles.resultChange}>
              Zurück: {formatCFA(resultModal?.change ?? 0)}
            </Text>
            <TouchableOpacity
              style={styles.resultBtn}
              onPress={() => setResultModal(null)}
            >
              <Text style={styles.resultBtnText}>Weiter verkaufen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  topBar: { padding: 12, backgroundColor: "#fff" },
  searchInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  productGrid: { padding: 8 },
  productTile: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    margin: 4,
    alignItems: "center",
    minHeight: 90,
    justifyContent: "center",
    elevation: 2,
  },
  productName: { fontSize: 15, fontWeight: "600", textAlign: "center", color: "#1f2937" },
  productPrice: { fontSize: 16, fontWeight: "bold", color: "#0f766e", marginTop: 4 },
  productStock: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  customRow: {
    flexDirection: "row",
    padding: 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginRight: 8,
  },
  customBtn: {
    backgroundColor: "#0f766e",
    borderRadius: 8,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  customBtnText: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  cartContainer: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    maxHeight: 300,
    padding: 12,
  },
  cartTitle: { fontSize: 18, fontWeight: "bold", color: "#1f2937", marginBottom: 8 },
  cartRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  cartItemName: { flex: 1, fontSize: 15, color: "#374151" },
  qtyControls: { flexDirection: "row", alignItems: "center", marginRight: 12 },
  qtyBtn: { fontSize: 22, color: "#0f766e", paddingHorizontal: 8 },
  qtyText: { fontSize: 16, fontWeight: "bold", minWidth: 24, textAlign: "center" },
  removeBtn: { fontSize: 16, color: "#ef4444", marginLeft: 8 },
  cartLineTotal: { fontSize: 15, fontWeight: "600", color: "#1f2937", minWidth: 100, textAlign: "right" },
  checkoutBtn: {
    backgroundColor: "#0f766e",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginTop: 12,
  },
  checkoutBtnText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 380,
  },
  modalTitle: { fontSize: 24, fontWeight: "bold", textAlign: "center", marginBottom: 16 },
  modalTotal: { fontSize: 22, fontWeight: "bold", color: "#0f766e", textAlign: "center", marginBottom: 16 },
  modalLabel: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 6, marginTop: 12 },
  modalInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 14,
    fontSize: 20,
    textAlign: "center",
  },
  modalChange: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#059669",
    textAlign: "center",
    marginTop: 16,
  },
  modalButtons: { flexDirection: "row", marginTop: 24, gap: 12 },
  modalCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  modalCancelText: { fontSize: 16, color: "#6b7280" },
  modalConfirm: {
    flex: 1,
    backgroundColor: "#0f766e",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  modalConfirmText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  resultContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
  },
  resultTitle: { fontSize: 24, fontWeight: "bold", color: "#059669", marginBottom: 16 },
  resultTotal: { fontSize: 18, color: "#374151", marginBottom: 8 },
  resultChange: { fontSize: 32, fontWeight: "bold", color: "#0f766e", marginBottom: 24 },
  resultBtn: {
    backgroundColor: "#0f766e",
    borderRadius: 10,
    padding: 16,
    paddingHorizontal: 32,
  },
  resultBtnText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  qtyContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 380,
  },
  qtyTitle: { fontSize: 22, fontWeight: "bold", textAlign: "center", color: "#1f2937", marginBottom: 4 },
  qtyPrice: { fontSize: 16, color: "#0f766e", textAlign: "center", fontWeight: "600", marginBottom: 20 },
  qtyLabel: { fontSize: 15, fontWeight: "600", color: "#374151", marginBottom: 8, textAlign: "center" },
  qtyInput: {
    borderWidth: 2,
    borderColor: "#0f766e",
    borderRadius: 12,
    padding: 16,
    fontSize: 32,
    textAlign: "center",
    fontWeight: "bold",
    color: "#0f766e",
    marginBottom: 16,
  },
  qtyQuickRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 8 },
  qtyQuickBtn: {
    backgroundColor: "#f0fdfa",
    borderWidth: 1,
    borderColor: "#0f766e",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  qtyQuickText: { fontSize: 18, fontWeight: "bold", color: "#0f766e" },
});
