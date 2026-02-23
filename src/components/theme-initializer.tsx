"use client";

import { useEffect } from "react";
import { applyTheme, type ThemePreferences } from "@/lib/theme";

interface ThemeInitializerProps {
  preferences: ThemePreferences;
}

export function ThemeInitializer({ preferences }: ThemeInitializerProps) {
  useEffect(() => {
    applyTheme(preferences);
  }, [preferences]);

  return null;
}
