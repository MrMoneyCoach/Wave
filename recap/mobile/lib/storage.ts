import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import type { RecapConfig } from "./types";

const CONFIG_KEY = "recap.config";

// SecureStore values are limited to ~2 KB on iOS, so we keep the Supabase
// session in AsyncStorage (its size grows with JWT) and only put the small
// config blob in SecureStore. Web falls back to localStorage via AsyncStorage.

async function setItem(key: string, value: string) {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return await AsyncStorage.getItem(key);
  }
  return await SecureStore.getItemAsync(key);
}

async function removeItem(key: string) {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function loadConfig(): Promise<RecapConfig | null> {
  const raw = await getItem(CONFIG_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.webUrl && parsed.supabaseUrl && parsed.supabaseAnonKey) return parsed;
    return null;
  } catch {
    return null;
  }
}

export async function saveConfig(cfg: RecapConfig) {
  await setItem(CONFIG_KEY, JSON.stringify(cfg));
}

export async function clearConfig() {
  await removeItem(CONFIG_KEY);
}

/** Supabase session storage adapter — uses AsyncStorage so big tokens fit. */
export const sessionStorageAdapter = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};
