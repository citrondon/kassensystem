import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";

const PHOTOS_DIR = FileSystem.documentDirectory + "photos/";

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(PHOTOS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
  }
}

export async function takePhoto(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return await savePhoto(result.assets[0].uri);
}

export async function pickPhoto(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return await savePhoto(result.assets[0].uri);
}

async function savePhoto(uri: string): Promise<string> {
  await ensureDir();
  const filename = `photo_${Date.now()}.jpg`;
  const dest = PHOTOS_DIR + filename;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}
