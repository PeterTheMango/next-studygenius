-- Migration: Add User Preferences for Theme and Appearance
-- Created: 2025-12-10
-- Description: Extends profiles table with appearance and theme customization columns

-- Add appearance and theme preference columns to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS appearance_mode TEXT DEFAULT 'system' CHECK (appearance_mode IN ('light', 'dark', 'system')),
  ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT 'blue',
  ADD COLUMN IF NOT EXISTS theme_custom_primary TEXT,
  ADD COLUMN IF NOT EXISTS theme_custom_secondary TEXT,
  ADD COLUMN IF NOT EXISTS theme_custom_accent TEXT,
  ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'inter',
  ADD COLUMN IF NOT EXISTS font_size TEXT DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large'));

-- Add comment for documentation
COMMENT ON COLUMN profiles.appearance_mode IS 'User preferred appearance: light, dark, or system';
COMMENT ON COLUMN profiles.theme_color IS 'Preset theme color name (e.g., blue, purple, green, orange)';
COMMENT ON COLUMN profiles.theme_custom_primary IS 'Custom primary color in hex format for advanced theming';
COMMENT ON COLUMN profiles.theme_custom_secondary IS 'Custom secondary color in hex format for advanced theming';
COMMENT ON COLUMN profiles.theme_custom_accent IS 'Custom accent color in hex format for advanced theming';
COMMENT ON COLUMN profiles.font_family IS 'User preferred font family (e.g., inter, roboto, system)';
COMMENT ON COLUMN profiles.font_size IS 'User preferred font size: small, medium, or large';
