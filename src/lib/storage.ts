/**
 * Thin, failure-tolerant wrapper around AsyncStorage.
 *
 * Every method swallows the underlying exception and logs a warning. Auth
 * state must never crash the app if the device storage is full, locked, or
 * unavailable (e.g. broken native module link). Callers should treat a `null`
 * return from getters as "no value" and a no-op from setters as best-effort.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Storage {
  getString(key: string): Promise<string | null>;
  setString(key: string, value: string): Promise<void>;
  getJSON<T>(key: string): Promise<T | null>;
  setJSON<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

export const storage: Storage = {
  async getString(key) {
    try {
      return await AsyncStorage.getItem(key);
    } catch (err) {
      console.warn(`[storage] getString(${key}) failed`, err);
      return null;
    }
  },

  async setString(key, value) {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (err) {
      console.warn(`[storage] setString(${key}) failed`, err);
    }
  },

  async getJSON<T>(key: string) {
    const raw = await storage.getString(key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch (err) {
      console.warn(`[storage] getJSON(${key}) parse failed`, err);
      return null;
    }
  },

  async setJSON<T>(key: string, value: T) {
    await storage.setString(key, JSON.stringify(value));
  },

  async remove(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch (err) {
      console.warn(`[storage] remove(${key}) failed`, err);
    }
  },
};
