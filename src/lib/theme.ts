// Theme color presets with their CSS variable values
export const THEME_COLORS = {
  blue: {
    name: "Blue",
    primary: "#3b82f6",
    secondary: "#60a5fa",
    accent: "#2563eb",
  },
  purple: {
    name: "Purple",
    primary: "#a855f7",
    secondary: "#c084fc",
    accent: "#9333ea",
  },
  green: {
    name: "Green",
    primary: "#10b981",
    secondary: "#34d399",
    accent: "#059669",
  },
  orange: {
    name: "Orange",
    primary: "#f97316",
    secondary: "#fb923c",
    accent: "#ea580c",
  },
  pink: {
    name: "Pink",
    primary: "#ec4899",
    secondary: "#f472b6",
    accent: "#db2777",
  },
  teal: {
    name: "Teal",
    primary: "#14b8a6",
    secondary: "#2dd4bf",
    accent: "#0d9488",
  },
} as const;

export type ThemeColorKey = keyof typeof THEME_COLORS;

// Font family options
export const FONT_FAMILIES = {
  inter: {
    name: "Inter",
    value: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  roboto: {
    name: "Roboto",
    value: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  system: {
    name: "System",
    value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif",
  },
  mono: {
    name: "Monospace",
    value: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
  },
} as const;

export type FontFamilyKey = keyof typeof FONT_FAMILIES;

// Font size options (base font size in rem)
export const FONT_SIZES = {
  small: {
    name: "Small",
    value: "0.875rem", // 14px
  },
  medium: {
    name: "Medium",
    value: "1rem", // 16px
  },
  large: {
    name: "Large",
    value: "1.125rem", // 18px
  },
} as const;

export type FontSizeKey = keyof typeof FONT_SIZES;

// Apply theme to document root
export function applyTheme(preferences: {
  themeColor: string;
  themeCustomPrimary?: string | null;
  themeCustomSecondary?: string | null;
  themeCustomAccent?: string | null;
  fontFamily: string;
  fontSize: string;
}) {
  const root = document.documentElement;

  // Apply color theme
  if (
    preferences.themeCustomPrimary &&
    preferences.themeCustomSecondary &&
    preferences.themeCustomAccent
  ) {
    // Use custom colors
    root.style.setProperty("--color-primary", preferences.themeCustomPrimary);
    root.style.setProperty("--color-secondary", preferences.themeCustomSecondary);
    root.style.setProperty("--color-accent", preferences.themeCustomAccent);
  } else {
    // Use preset color theme
    const colorTheme = THEME_COLORS[preferences.themeColor as ThemeColorKey] || THEME_COLORS.blue;
    root.style.setProperty("--color-primary", colorTheme.primary);
    root.style.setProperty("--color-secondary", colorTheme.secondary);
    root.style.setProperty("--color-accent", colorTheme.accent);
  }

  // Apply font family
  const fontFamily = FONT_FAMILIES[preferences.fontFamily as FontFamilyKey] || FONT_FAMILIES.inter;
  root.style.setProperty("--font-family", fontFamily.value);

  // Apply font size
  const fontSize = FONT_SIZES[preferences.fontSize as FontSizeKey] || FONT_SIZES.medium;
  root.style.setProperty("--font-size-base", fontSize.value);
}

// Hex color validation
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(color);
}

// Convert hex to RGB for CSS variables
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}
