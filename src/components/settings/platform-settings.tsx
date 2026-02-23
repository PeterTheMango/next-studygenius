"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { THEME_COLORS, FONT_FAMILIES, FONT_SIZES, applyTheme } from "@/lib/theme";
import { Sun, Moon, Monitor, Check, ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";

interface PlatformSettingsProps {
  profile: any;
}

export function PlatformSettings({ profile }: PlatformSettingsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form state
  const [appearanceMode, setAppearanceMode] = useState(profile.appearance_mode || "system");
  const [themeColor, setThemeColor] = useState(profile.theme_color || "blue");
  const [customPrimary, setCustomPrimary] = useState(profile.theme_custom_primary || "#3b82f6");
  const [customSecondary, setCustomSecondary] = useState(profile.theme_custom_secondary || "#60a5fa");
  const [customAccent, setCustomAccent] = useState(profile.theme_custom_accent || "#2563eb");
  const [fontFamily, setFontFamily] = useState(profile.font_family || "inter");
  const [fontSize, setFontSize] = useState(profile.font_size || "medium");

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

      // Apply theme to current session
      applyTheme({
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
    <div className="space-y-6">
      {/* Appearance Mode */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Choose how StudyGenius looks to you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setAppearanceMode("light")}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                appearanceMode === "light"
                  ? "border-blue-600 bg-blue-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <Sun className="h-6 w-6" />
              <span className="text-sm font-medium">Light</span>
            </button>
            <button
              onClick={() => setAppearanceMode("dark")}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                appearanceMode === "dark"
                  ? "border-blue-600 bg-blue-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <Moon className="h-6 w-6" />
              <span className="text-sm font-medium">Dark</span>
            </button>
            <button
              onClick={() => setAppearanceMode("system")}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                appearanceMode === "system"
                  ? "border-blue-600 bg-blue-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <Monitor className="h-6 w-6" />
              <span className="text-sm font-medium">System</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Theme Colors */}
      <Card>
        <CardHeader>
          <CardTitle>Theme Color</CardTitle>
          <CardDescription>
            Select a color theme for your interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(THEME_COLORS).map(([key, color]) => (
              <button
                key={key}
                onClick={() => setThemeColor(key)}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                  themeColor === key
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex gap-1">
                  <div
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: color.primary }}
                  />
                  <div
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: color.secondary }}
                  />
                </div>
                <span className="text-sm font-medium flex-1 text-left">{color.name}</span>
                {themeColor === key && <Check className="h-4 w-4 text-blue-600" />}
              </button>
            ))}
          </div>

          <Separator />

          {/* Advanced Color Customization */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Advanced Color Customization
          </button>

          {showAdvanced && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="custom-primary">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="custom-primary"
                      type="color"
                      value={customPrimary}
                      onChange={(e) => setCustomPrimary(e.target.value)}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={customPrimary}
                      onChange={(e) => setCustomPrimary(e.target.value)}
                      placeholder="#3b82f6"
                      className="flex-1"
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
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={customSecondary}
                      onChange={(e) => setCustomSecondary(e.target.value)}
                      placeholder="#60a5fa"
                      className="flex-1"
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
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={customAccent}
                      onChange={(e) => setCustomAccent(e.target.value)}
                      placeholder="#2563eb"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Custom colors will override the selected theme preset
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Font Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Font Settings</CardTitle>
          <CardDescription>
            Customize the typography of your interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Font Family */}
          <div className="space-y-2">
            <Label htmlFor="font-family">Font Family</Label>
            <Select value={fontFamily} onValueChange={setFontFamily}>
              <SelectTrigger id="font-family">
                <SelectValue placeholder="Select a font" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FONT_FAMILIES).map(([key, font]) => (
                  <SelectItem key={key} value={key}>
                    {font.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Font Size */}
          <div className="space-y-2">
            <Label>Font Size</Label>
            <RadioGroup value={fontSize} onValueChange={setFontSize}>
              <div className="flex gap-4">
                {Object.entries(FONT_SIZES).map(([key, size]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <RadioGroupItem value={key} id={`size-${key}`} />
                    <Label htmlFor={`size-${key}`} className="font-normal cursor-pointer">
                      {size.name}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading} size="lg">
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
