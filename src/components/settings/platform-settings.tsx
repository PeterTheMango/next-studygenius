"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { THEME_COLORS, FONT_FAMILIES, FONT_SIZES, applyTheme } from "@/lib/theme";
import type { AppearanceMode } from "@/lib/theme";
import { Sun, Moon, Monitor, Check, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface PlatformSettingsProps {
  profile: any;
}

const APPEARANCE_MODES = [
  {
    key: "light" as const,
    label: "Light",
    icon: Sun,
    previewBg: "bg-white",
    previewBars: ["bg-muted", "bg-muted/70", "bg-muted/50"],
  },
  {
    key: "dark" as const,
    label: "Dark",
    icon: Moon,
    previewBg: "bg-zinc-800",
    previewBars: ["bg-zinc-600", "bg-zinc-700", "bg-zinc-700"],
  },
  {
    key: "system" as const,
    label: "System",
    icon: Monitor,
    previewBg: "bg-gradient-to-r from-white to-zinc-800",
    previewBars: ["bg-zinc-400", "bg-zinc-300", "bg-zinc-500"],
  },
];

export function PlatformSettings({ profile }: PlatformSettingsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Initial values for change detection
  const initial = useMemo(
    () => ({
      appearanceMode: (profile.appearance_mode || "system") as AppearanceMode,
      themeColor: profile.theme_color || "blue",
      customPrimary: profile.theme_custom_primary || "#3b82f6",
      customSecondary: profile.theme_custom_secondary || "#60a5fa",
      customAccent: profile.theme_custom_accent || "#2563eb",
      fontFamily: profile.font_family || "inter",
      fontSize: profile.font_size || "medium",
    }),
    [profile]
  );

  // Form state
  const [appearanceMode, setAppearanceMode] = useState<AppearanceMode>(initial.appearanceMode);
  const [themeColor, setThemeColor] = useState(initial.themeColor);
  const [customPrimary, setCustomPrimary] = useState(initial.customPrimary);
  const [customSecondary, setCustomSecondary] = useState(initial.customSecondary);
  const [customAccent, setCustomAccent] = useState(initial.customAccent);
  const [fontFamily, setFontFamily] = useState(initial.fontFamily);
  const [fontSize, setFontSize] = useState(initial.fontSize);

  const hasChanges =
    appearanceMode !== initial.appearanceMode ||
    themeColor !== initial.themeColor ||
    customPrimary !== initial.customPrimary ||
    customSecondary !== initial.customSecondary ||
    customAccent !== initial.customAccent ||
    fontFamily !== initial.fontFamily ||
    fontSize !== initial.fontSize;

  const handleReset = () => {
    setAppearanceMode(initial.appearanceMode);
    setThemeColor(initial.themeColor);
    setCustomPrimary(initial.customPrimary);
    setCustomSecondary(initial.customSecondary);
    setCustomAccent(initial.customAccent);
    setFontFamily(initial.fontFamily);
    setFontSize(initial.fontSize);
  };

  const handleSave = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/users/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appearanceMode,
          themeColor,
          themeCustomPrimary: showAdvanced ? customPrimary : null,
          themeCustomSecondary: showAdvanced ? customSecondary : null,
          themeCustomAccent: showAdvanced ? customAccent : null,
          fontFamily,
          fontSize,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update preferences");
      }

      applyTheme({
        appearanceMode,
        themeColor,
        themeCustomPrimary: showAdvanced ? customPrimary : null,
        themeCustomSecondary: showAdvanced ? customSecondary : null,
        themeCustomAccent: showAdvanced ? customAccent : null,
        fontFamily,
        fontSize,
      });

      toast.success(data.message);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Appearance Mode */}
      <section
        id="appearance"
        className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500"
        style={{ animationDelay: "0ms", animationFillMode: "backwards" }}
      >
        <div>
          <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choose how StudyGenius looks to you
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {APPEARANCE_MODES.map((mode) => {
            const selected = appearanceMode === mode.key;
            return (
              <button
                key={mode.key}
                onClick={() => setAppearanceMode(mode.key)}
                className={cn(
                  "relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200",
                  selected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-muted-foreground/30"
                )}
              >
                {/* Mini preview window */}
                <div
                  className={cn(
                    "w-full aspect-[4/3] rounded-lg overflow-hidden border border-border/50",
                    mode.previewBg
                  )}
                >
                  <div className="p-2 space-y-1.5">
                    <div className={cn("h-1.5 w-3/4 rounded-full", mode.previewBars[0])} />
                    <div className={cn("h-1.5 w-1/2 rounded-full", mode.previewBars[1])} />
                    <div className={cn("h-1.5 w-2/3 rounded-full", mode.previewBars[2])} />
                  </div>
                </div>
                <span className="text-sm font-medium">{mode.label}</span>
                {/* Checkmark badge */}
                {selected && (
                  <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <Separator />

      {/* Theme Colors */}
      <section
        id="theme"
        className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500"
        style={{ animationDelay: "75ms", animationFillMode: "backwards" }}
      >
        <div>
          <h2 className="text-lg font-semibold text-foreground">Theme Color</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Select a color theme for your interface
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(THEME_COLORS).map(([key, color]) => {
            const selected = themeColor === key;
            return (
              <button
                key={key}
                onClick={() => setThemeColor(key)}
                className={cn(
                  "relative flex flex-col gap-3 p-3 rounded-xl border-2 transition-all duration-200 text-left",
                  selected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-muted-foreground/30"
                )}
              >
                {/* Gradient bar */}
                <div
                  className="w-full h-8 rounded-lg"
                  style={{
                    background: `linear-gradient(to right, ${color.primary}, ${color.secondary}, ${color.accent})`,
                  }}
                />
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: color.primary }}
                  />
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: color.secondary }}
                  />
                  <span className="text-sm font-medium flex-1">{color.name}</span>
                </div>
                {/* Checkmark badge */}
                {selected && (
                  <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <Separator />

        {/* Advanced Color Customization */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAdvanced ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          Advanced Color Customization
        </button>

        <div
          className={cn(
            "grid transition-all duration-300 ease-in-out",
            showAdvanced ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="overflow-hidden">
            <div className="space-y-4 pt-2 pb-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="custom-primary">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="custom-primary"
                      type="color"
                      value={customPrimary}
                      onChange={(e) => setCustomPrimary(e.target.value)}
                      className="w-16 h-10 p-1 cursor-pointer min-h-[44px]"
                    />
                    <Input
                      type="text"
                      value={customPrimary}
                      onChange={(e) => setCustomPrimary(e.target.value)}
                      placeholder="#3b82f6"
                      className="flex-1 min-h-[44px]"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-secondary">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="custom-secondary"
                      type="color"
                      value={customSecondary}
                      onChange={(e) => setCustomSecondary(e.target.value)}
                      className="w-16 h-10 p-1 cursor-pointer min-h-[44px]"
                    />
                    <Input
                      type="text"
                      value={customSecondary}
                      onChange={(e) => setCustomSecondary(e.target.value)}
                      placeholder="#60a5fa"
                      className="flex-1 min-h-[44px]"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-accent">Accent Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="custom-accent"
                      type="color"
                      value={customAccent}
                      onChange={(e) => setCustomAccent(e.target.value)}
                      className="w-16 h-10 p-1 cursor-pointer min-h-[44px]"
                    />
                    <Input
                      type="text"
                      value={customAccent}
                      onChange={(e) => setCustomAccent(e.target.value)}
                      placeholder="#2563eb"
                      className="flex-1 min-h-[44px]"
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Custom colors will override the selected theme preset
              </p>
            </div>
          </div>
        </div>
      </section>

      <Separator />

      {/* Font Settings */}
      <section
        id="typography"
        className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500"
        style={{ animationDelay: "150ms", animationFillMode: "backwards" }}
      >
        <div>
          <h2 className="text-lg font-semibold text-foreground">Typography</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Customize the typography of your interface
          </p>
        </div>

        {/* Font Family - Visual Card Selectors */}
        <div className="space-y-3">
          <Label>Font Family</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(FONT_FAMILIES).map(([key, font]) => {
              const selected = fontFamily === key;
              return (
                <button
                  key={key}
                  onClick={() => setFontFamily(key)}
                  className={cn(
                    "relative flex flex-col gap-2 p-4 rounded-xl border-2 transition-all duration-200 text-left min-h-[44px]",
                    selected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-muted-foreground/30"
                  )}
                >
                  <span className="text-sm font-medium text-foreground">
                    {font.name}
                  </span>
                  <span
                    className="text-sm text-muted-foreground leading-relaxed"
                    style={{ fontFamily: font.value }}
                  >
                    The quick brown fox jumps over the lazy dog
                  </span>
                  {selected && (
                    <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Font Size - Segmented Control */}
        <div className="space-y-3">
          <Label>Font Size</Label>
          <div className="inline-flex rounded-lg bg-muted p-1">
            {Object.entries(FONT_SIZES).map(([key, size]) => (
              <button
                key={key}
                onClick={() => setFontSize(key)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 min-h-[44px]",
                  fontSize === key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {size.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Sticky Save Bar */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 md:left-64 right-0 z-50 border-t border-border backdrop-blur-sm bg-background/80 px-6 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">You have unsaved changes</p>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleReset} size="sm" className="min-h-[44px]">
                Discard
              </Button>
              <Button onClick={handleSave} disabled={isLoading} size="sm" className="min-h-[44px]">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
