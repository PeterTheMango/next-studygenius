# TODO

## ✅ User Profile Customization / Settings Page (COMPLETED)

**Feature Overview:**
When the user clicks on the user section of the navbar, a dropdown is shown to view settings, which leads them to the /settings page where they can choose between two tabs: Platform | User Profile

### ✅ Platform Settings:
- ✅ Appearance (Dark/Light/System)
- ✅ Theme Picker (6 color presets: Blue, Purple, Green, Orange, Pink, Teal)
- ✅ Advanced Custom Colors (Primary, Secondary, Accent with color pickers)
- ✅ Font Family (Inter, Roboto, System, Monospace)
- ✅ Font Size (Small, Medium, Large)

### ✅ User Profile (View or Update):
- ✅ Email (With Supabase confirmation flow - sends to both old and new emails)
- ✅ Full Name
- ✅ Profile Picture (Upload/Remove with 2MB limit, JPG/PNG/WebP support)

**Implementation Details:**
- Database migration: `supabase/migrations/20251210_add_user_preferences.sql`
- Storage setup: `supabase/storage-setup.md`
- Setup guide: `SETUP_INSTRUCTIONS.md`

**Files Created:**
- `/src/app/(dashboard)/settings/page.tsx` - Main settings page
- `/src/components/settings/platform-settings.tsx` - Platform settings tab
- `/src/components/settings/user-profile-settings.tsx` - User profile tab
- `/src/app/api/users/profile/route.ts` - Profile update API
- `/src/app/api/users/avatar/route.ts` - Avatar upload/delete API
- `/src/app/api/users/preferences/route.ts` - Preferences update API
- `/src/lib/theme.ts` - Theme utility functions
- Updated: `/src/components/layout/navbar.tsx` - Added user dropdown
- Updated: `/src/lib/validations.ts` - Added settings validation schemas

**Next Steps:**
- Run database migration (see SETUP_INSTRUCTIONS.md)
- Set up Supabase Storage bucket for avatars (see supabase/storage-setup.md)
- Test the feature by navigating to /settings
