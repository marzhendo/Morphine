import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppSettings } from "@/types/conversion";
import { DEFAULT_SETTINGS } from "@/types/conversion";

interface SettingsState {
  settings: AppSettings;
  setOutputDir: (dir: "same_as_input" | "custom") => void;
  setCustomDir: (path: string) => void;
  setConcurrentJobs: (n: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      setOutputDir: (dir) =>
        set((s) => ({ settings: { ...s.settings, defaultOutputDir: dir } })),
      setCustomDir: (path) =>
        set((s) => ({ settings: { ...s.settings, customOutputDir: path, defaultOutputDir: "custom" } })),
      setConcurrentJobs: (n) =>
        set((s) => ({
          settings: { ...s.settings, concurrentJobs: Math.min(4, Math.max(1, n)) }
        })),
    }),
    { name: "morphine-settings" }
  )
);
