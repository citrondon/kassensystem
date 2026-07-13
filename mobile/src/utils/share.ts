import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { getProducts, addProduct, Product } from "../db/queries";

export async function exportProducts(): Promise<void> {
  const products = await getProducts();
  const data = JSON.stringify(
    products.map((p) => ({
      name: p.name,
      price: p.price,
      unit: p.unit,
      category: p.category,
      barcode: p.barcode,
    })),
    null,
    2
  );
  const path = FileSystem.documentDirectory + "product_export.json";
  await FileSystem.writeAsStringAsync(path, data, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: "application/json",
      dialogTitle: "Produktliste senden",
    });
  }
}

export async function importProducts(): Promise<number> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/json",
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return 0;
  const uri = result.assets[0].uri;
  const content = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const items: { name: string; price: number; unit: string; category: string | null; barcode: string | null }[] =
    JSON.parse(content);
  let count = 0;
  for (const item of items) {
    await addProduct(
      item.name,
      item.price,
      0,
      item.category ?? null,
      item.unit ?? "Stück",
      0,
      5,
      item.barcode ?? null,
      null
    );
    count++;
  }
  return count;
}

export async function shareApp(): Promise<void> {
  // In Expo Go / dev: share the export JSON as a lightweight proxy.
  // In standalone APK build: the APK itself can be shared.
  const path = FileSystem.documentDirectory + "app_info.txt";
  await FileSystem.writeAsStringAsync(
    path,
    "Kassensystem — Offline POS für Westafrika\n\nDiese App ist zu 100% kostenlos und benötigt kein Internet.\nFrag den Händler nebenan nach der APK-Datei!",
    { encoding: FileSystem.EncodingType.UTF8 }
  );
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: "text/plain",
      dialogTitle: "App weitergeben",
    });
  }
}
