"use client";

import { useEffect } from "react";
import { applySettings, getSettings } from "@/lib/hooks/use-settings";

export function SettingsSync() {
  useEffect(() => {
    applySettings(getSettings());
  }, []);
  return null;
}
