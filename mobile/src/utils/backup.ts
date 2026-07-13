import * as FileSystem from "expo-file-system/legacy";
import { getSetting, setSetting } from "../db/queries";

const BACKUP_DIR = FileSystem.documentDirectory + "backups/";

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(BACKUP_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(BACKUP_DIR, { intermediates: true });
  }
}

export async function backupDatabase(): Promise<string | null> {
  await ensureDir();
  const dbPath = FileSystem.documentDirectory + "SQLite/pos_offline.db";
  const info = await FileSystem.getInfoAsync(dbPath);
  if (!info.exists) return null;

  const date = new Date().toISOString().slice(0, 10);
  const dest = BACKUP_DIR + `pos_backup_${date}.db`;
  await FileSystem.copyAsync({ from: dbPath, to: dest });
  await setSetting("last_backup", date);
  return dest;
}

export async function shouldBackup(): Promise<boolean> {
  const last = await getSetting("last_backup");
  if (!last) return true;
  const today = new Date().toISOString().slice(0, 10);
  const diff = (new Date(today).getTime() - new Date(last).getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 1;
}

export async function listBackups(): Promise<{ uri: string; date: string }[]> {
  await ensureDir();
  const files = await FileSystem.readDirectoryAsync(BACKUP_DIR);
  return files
    .filter((f) => f.endsWith(".db"))
    .map((f) => ({
      uri: BACKUP_DIR + f,
      date: f.replace("pos_backup_", "").replace(".db", ""),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function restoreFromBackup(uri: string): Promise<boolean> {
  const dbPath = FileSystem.documentDirectory + "SQLite/pos_offline.db";
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) return false;
  await FileSystem.copyAsync({ from: uri, to: dbPath });
  return true;
}

export async function hasBackups(): Promise<boolean> {
  const backups = await listBackups();
  return backups.length > 0;
}
