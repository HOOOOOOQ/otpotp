"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "kaii-otp-settings";

export interface UserSettings {
  pollIntervalSeconds: 8 | 12 | 20 | 30;
  reduceMotion: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  pollIntervalSeconds: 12,
  reduceMotion: false,
};

export function getSettings(): UserSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    const interval = Number(parsed.pollIntervalSeconds);
    return {
      pollIntervalSeconds: ([8, 12, 20, 30].includes(interval)
        ? interval
        : DEFAULT_SETTINGS.pollIntervalSeconds) as UserSettings["pollIntervalSeconds"],
      reduceMotion: Boolean(parsed.reduceMotion),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  applySettings(settings);
  window.dispatchEvent(new CustomEvent("kaii-settings-changed", { detail: settings }));
}

export function applySettings(settings: UserSettings): void {
  document.documentElement.dataset.motion = settings.reduceMotion ? "reduced" : "full";
}

export function useSettings() {
  const [settings, setSettingsState] = useState<UserSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const current = getSettings();
    setSettingsState(current);
    applySettings(current);
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<UserSettings>).detail;
      setSettingsState(detail ?? getSettings());
    };
    window.addEventListener("kaii-settings-changed", listener);
    return () => window.removeEventListener("kaii-settings-changed", listener);
  }, []);

  const update = useCallback((next: UserSettings) => {
    setSettingsState(next);
    saveSettings(next);
  }, []);

  return { settings, update };
}
