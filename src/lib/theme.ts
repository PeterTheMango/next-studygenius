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

// Font size options (base font size in px)
export const FONT_SIZES = {
  small: {
    name: "Small",
    value: "14px",
  },
  medium: {
    name: "Medium",
    value: "16px",
  },
  large: {
    name: "Large",
    value: "18px",
  },
} as const;

export type FontSizeKey = keyof typeof FONT_SIZES;

export type AppearanceMode = "light" | "dark" | "system";

export interface ThemePreferences {
  appearanceMode?: AppearanceMode;
  themeColor: string;
  themeCustomPrimary?: string | null;
  themeCustomSecondary?: string | null;
  themeCustomAccent?: string | null;
  fontFamily: string;
  fontSize: string;
}

// Convert hex to oklch string for CSS variables
// Uses sRGB -> linear sRGB -> XYZ -> oklab -> oklch pipeline
function hexToOklch(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  // sRGB to linear sRGB
  const linearize = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const lr = linearize(r);
  const lg = linearize(g);
  const lb = linearize(b);

  // Linear sRGB to OKLab (using the cube-root matrix approach)
  const l_ = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m_ = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s_ = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_cbrt = Math.cbrt(l_);
  const m_cbrt = Math.cbrt(m_);
  const s_cbrt = Math.cbrt(s_);

  const L = 0.2104542553 * l_cbrt + 0.793617785 * m_cbrt - 0.0040720468 * s_cbrt;
  const a = 1.9779984951 * l_cbrt - 2.428592205 * m_cbrt + 0.4505937099 * s_cbrt;
  const bOk = 0.0259040371 * l_cbrt + 0.7827717662 * m_cbrt - 0.808675766 * s_cbrt;

  // OKLab to OKLCH
  const C = Math.sqrt(a * a + bOk * bOk);
  let H = (Math.atan2(bOk, a) * 180) / Math.PI;
  if (H < 0) H += 360;

  // Round for cleaner CSS output
  const lRound = Math.round(L * 1000) / 1000;
  const cRound = Math.round(C * 1000) / 1000;
  const hRound = Math.round(H * 1000) / 1000;

  return `oklch(${lRound} ${cRound} ${hRound})`;
}

// Compute a contrasting foreground color for a given hex background
function foregroundForHex(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  // Relative luminance
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.5 ? "oklch(0.205 0 0)" : "oklch(0.985 0 0)";
}

// Private reference to the system media query listener so we can clean it up
let _systemMediaCleanup: (() => void) | null = null;

function applyAppearanceMode(mode: AppearanceMode) {
  const root = document.documentElement;

  // Clean up previous system listener
  if (_systemMediaCleanup) {
    _systemMediaCleanup();
    _systemMediaCleanup = null;
  }

  if (mode === "light") {
    root.classList.remove("dark");
  } else if (mode === "dark") {
    root.classList.add("dark");
  } else {
    // system
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = (e: MediaQueryList | MediaQueryListEvent) => {
      if (e.matches) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };
    apply(mql);
    const handler = (e: MediaQueryListEvent) => apply(e);
    mql.addEventListener("change", handler);
    _systemMediaCleanup = () => mql.removeEventListener("change", handler);
  }
}

const THEME_STYLE_ID = "studygenius-theme-overrides";

// Apply theme to document root
export function applyTheme(preferences: ThemePreferences) {
  const root = document.documentElement;

  // 1. Appearance mode (light/dark/system)
  if (preferences.appearanceMode) {
    applyAppearanceMode(preferences.appearanceMode);
  }

  // 2. Resolve colors (custom overrides preset)
  let primary: string;
  let secondary: string;
  let accent: string;

  if (
    preferences.themeCustomPrimary &&
    preferences.themeCustomSecondary &&
    preferences.themeCustomAccent
  ) {
    primary = preferences.themeCustomPrimary;
    secondary = preferences.themeCustomSecondary;
    accent = preferences.themeCustomAccent;
  } else {
    const preset =
      THEME_COLORS[preferences.themeColor as ThemeColorKey] || THEME_COLORS.blue;
    primary = preset.primary;
    secondary = preset.secondary;
    accent = preset.accent;
  }

  const primaryOklch = hexToOklch(primary);
  const secondaryOklch = hexToOklch(secondary);
  const accentOklch = hexToOklch(accent);
  const primaryFg = foregroundForHex(primary);
  const secondaryFg = foregroundForHex(secondary);
  const accentFg = foregroundForHex(accent);

  // 3. Font
  const fontFamily =
    FONT_FAMILIES[preferences.fontFamily as FontFamilyKey] || FONT_FAMILIES.inter;
  const fontSize =
    FONT_SIZES[preferences.fontSize as FontSizeKey] || FONT_SIZES.medium;

  // Build a shared CSS block for the color vars.
  // We scope it under both :root and .dark so it beats the defaults from globals.css
  // regardless of light/dark mode. The `.dark` selector in globals.css has class specificity
  // that beats `:root` inline styles, so we use a <style> tag with matching selectors.
  const colorVars = `
    --primary: ${primaryOklch};
    --primary-foreground: ${primaryFg};
    --secondary: ${secondaryOklch};
    --secondary-foreground: ${secondaryFg};
    --accent: ${accentOklch};
    --accent-foreground: ${accentFg};
    --ring: ${primaryOklch};
    --sidebar-primary: ${primaryOklch};
    --sidebar-primary-foreground: ${primaryFg};
    --sidebar-accent: ${accentOklch};
    --sidebar-accent-foreground: ${accentFg};
  `;

  const css = `
    :root { ${colorVars} --font-family-theme: ${fontFamily.value}; --font-size-theme: ${fontSize.value}; }
    .dark { ${colorVars} }
  `;

  // Inject or update a <style> element
  let styleEl = document.getElementById(THEME_STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = THEME_STYLE_ID;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = css;

  // Also set on root inline for immediate specificity on non-dark vars
  root.style.setProperty("--font-family-theme", fontFamily.value);
  root.style.setProperty("--font-size-theme", fontSize.value);
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
