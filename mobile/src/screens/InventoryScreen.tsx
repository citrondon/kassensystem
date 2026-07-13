import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  Product,
} from "../db/queries";
import { formatCFA } from "../utils/format";
import { takePhoto, pickPhoto } from "../utils/photo";
import { Image } from "react-native";

const UNITS = ["Stück", "Kilosack", "Flasche", "Beutel", "Kiste"];

const EMPTY_FORM = {
  name: "",
  unit: "Stück" as string,
  cost_price: "",
  price: "",
  stock: "",
  low_stock_threshold: "5",
  category: "",
  image_path: "" as string,
  barcode: "" as string,
};

export default function InventoryScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    const prods = await getProducts();
    setProducts(prods);
  }

  const totalValue = useMemo(
    () => products.reduce((sum, p) => sum + p.price * p.stock, 0),
    [products]
  );

  function openCreate() {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    setForm({
      name: product.name,
      unit: product.unit,
      cost_price: product.cost_price?.toString() ?? "",
      price: product.price.toString(),
      stock: product.stock.toString(),
      low_stock_threshold: product.low_stock_threshold?.toString() ?? "5",
      category: product.category ?? "",
      image_path: product.image_path ?? "",
      barcode: product.barcode ?? "",
    });
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditingProduct(null);
    setForm(EMPTY_FORM);
  }

  function updateField<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const margin = useMemo(() => {
    const ek = parseInt(form.cost_price, 10) || 0;
    const vk = parseInt(form.price, 10) || 0;
    if (vk <= 0) return null;
    return ((vk - ek) / vk * 100).toFixed(0) + "%";
  }, [form.cost_price, form.price]);

  async function handleTakePhoto() {
    const uri = await takePhoto();
    if (uri) updateField("image_path", uri);
  }

  async function handlePickPhoto() {
    const uri = await pickPhoto();
    if (uri) updateField("image_path", uri);
  }

  async function handleSave() {
    const name = form.name.trim();
    if (!name) {
      Alert.alert("Fehler", "Produktname fehlt.");
      return;
    }
    const price = parseInt(form.price, 10) || 0;
    const costPrice = parseInt(form.cost_price, 10) || 0;
    const stock = parseInt(form.stock, 10) || 0;
    const lowStock = parseInt(form.low_stock_threshold, 10) ?? 5;
    const category = form.category.trim() || null;
    const imagePath = form.image_path.trim() || null;
    const barcode = form.barcode.trim() || null;

    if (editingProduct) {
      await updateProduct(editingProduct.id, {
        name,
        price,
        stock,
        unit: form.unit,
        cost_price: costPrice,
        low_stock_threshold: lowStock,
        category,
        image_path: imagePath,
        barcode,
      });
    } else {
      await addProduct(
        name,
        price,
        stock,
        category,
        form.unit,
        costPrice,
        lowStock,
        barcode,
        imagePath
      );
    }
    closeModal();
    await loadProducts();
  }

  function handleDelete(product: Product) {
    Alert.alert(
      "Löschen?",
      `${product.name} wirklich entfernen?`,
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Löschen",
          style: "destructive",
          onPress: async () => {
            await deleteProduct(product.id);
            await loadProducts();
          },
        },
      ]
    );
  }

  function renderUnitOption(unit: string) {
    const selected = form.unit === unit;
    return (
      <TouchableOpacity
        key={unit}
        style={[styles.unitBtn, selected && styles.unitBtnSelected]}
        onPress={() => updateField("unit", unit)}
      >
        <Text style={[styles.unitBtnText, selected && styles.unitBtnTextSelected]}>
          {unit}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <Text style={styles.summaryText}>Lagerwert: {formatCFA(totalValue)}</Text>
        <Text style={styles.summarySub}>
          {products.length} Produkt{products.length !== 1 ? "e" : ""}
        </Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Produkte</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.productRow}
            onPress={() => openEdit(item)}
            activeOpacity={0.8}
          >
            {item.image_path ? (
              <Image source={{ uri: item.image_path }} style={styles.productThumb} />
            ) : (
              <View style={styles.productThumbPlaceholder}>
                <Text style={styles.productThumbText}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productMeta}>
                {formatCFA(item.price)} • {item.stock} {item.unit}
                {item.stock <= item.low_stock_threshold && (
                  <Text style={styles.lowStockBadge}>  Niedrig</Text>
                )}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDelete(item)}
            >
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingProduct ? "Produkt bearbeiten" : "Neues Produkt"}
            </Text>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalLabel}>Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Produktname"
                value={form.name}
                onChangeText={(text) => updateField("name", text)}
                autoCapitalize="sentences"
              />

              {/* Foto */}
              <Text style={styles.modalLabel}>Foto</Text>
              {form.image_path ? (
                <View style={styles.photoPreviewRow}>
                  <Image source={{ uri: form.image_path }} style={styles.photoPreview} />
                  <TouchableOpacity
                    style={styles.photoRemoveBtn}
                    onPress={() => updateField("image_path", "")}
                  >
                    <Text style={styles.photoRemoveText}>✕ Entfernen</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              <View style={styles.photoBtnRow}>
                <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto}>
                  <Text style={styles.photoBtnText}>📷 Kamera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoBtn} onPress={handlePickPhoto}>
                  <Text style={styles.photoBtnText}>🖼 Galerie</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalLabel}>Einheit</Text>
              <View style={styles.unitRow}>
                {UNITS.map(renderUnitOption)}
              </View>

              <Text style={styles.modalLabel}>Einkaufspreis (CFA)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="0"
                keyboardType="numeric"
                value={form.cost_price}
                onChangeText={(text) => updateField("cost_price", text)}
              />

              <Text style={styles.modalLabel}>Verkaufspreis (CFA)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="0"
                keyboardType="numeric"
                value={form.price}
                onChangeText={(text) => updateField("price", text)}
              />

              {margin !== null && (
                <Text style={styles.marginText}>Marge: {margin}</Text>
              )}

              <Text style={styles.modalLabel}>Anfangsbestand</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="0"
                keyboardType="numeric"
                value={form.stock}
                onChangeText={(text) => updateField("stock", text)}
              />

              <Text style={styles.modalLabel}>Meldebestand</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="5"
                keyboardType="numeric"
                value={form.low_stock_threshold}
                onChangeText={(text) => updateField("low_stock_threshold", text)}
              />

              <Text style={styles.modalLabel}>Kategorie (optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="z. B. Getränke"
                value={form.category}
                onChangeText={(text) => updateField("category", text)}
              />

              <Text style={styles.modalLabel}>Barcode (optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="z. B. 3017620422003"
                value={form.barcode}
                onChangeText={(text) => updateField("barcode", text)}
                autoCapitalize="none"
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={closeModal}>
                <Text style={styles.modalCancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleSave}>
                <Text style={styles.modalConfirmText}>Speichern</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  summary: {
    backgroundColor: "#0f766e",
    padding: 16,
    alignItems: "center",
  },
  summaryText: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  summarySub: { fontSize: 14, color: "#ccfbf1", marginTop: 4 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#1f2937" },
  addBtn: {
    backgroundColor: "#0f766e",
    borderRadius: 8,
    padding: 8,
    paddingHorizontal: 14,
  },
  addBtnText: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  productName: { fontSize: 16, fontWeight: "600", color: "#1f2937" },
  productMeta: { fontSize: 14, color: "#6b7280", marginTop: 2 },
  lowStockBadge: { color: "#dc2626", fontWeight: "bold" },
  deleteBtn: {
    backgroundColor: "#fee2e2",
    borderRadius: 6,
    padding: 6,
    paddingHorizontal: 10,
    marginLeft: 8,
  },
  deleteBtnText: { fontSize: 16, color: "#dc2626", fontWeight: "bold" },
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
    maxHeight: "85%",
  },
  modalScroll: { maxHeight: 380 },
  modalTitle: { fontSize: 22, fontWeight: "bold", textAlign: "center", marginBottom: 16 },
  modalLabel: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 6, marginTop: 12 },
  modalInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 14,
    fontSize: 18,
  },
  unitRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  unitBtn: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  unitBtnSelected: { backgroundColor: "#0f766e", borderColor: "#0f766e" },
  unitBtnText: { color: "#374151", fontSize: 14 },
  unitBtnTextSelected: { color: "#fff", fontWeight: "600" },
  marginText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f766e",
    marginTop: 4,
  },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 16 },
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
  productThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  productThumbPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#0f766e",
    alignItems: "center",
    justifyContent: "center",
  },
  productThumbText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
  },
  photoPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  photoPreview: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  photoRemoveBtn: {
    backgroundColor: "#fee2e2",
    borderRadius: 6,
    padding: 6,
    paddingHorizontal: 10,
  },
  photoRemoveText: { fontSize: 13, color: "#dc2626", fontWeight: "600" },
  photoBtnRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  photoBtn: {
    flex: 1,
    backgroundColor: "#f0fdfa",
    borderWidth: 1,
    borderColor: "#0f766e",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  photoBtnText: { color: "#0f766e", fontSize: 15, fontWeight: "600" },
});
