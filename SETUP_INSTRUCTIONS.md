# Settings Feature Setup Instructions

## Database Migration Required

### 1. Run the Database Migration

You need to apply the new migration to add user preferences columns to the `profiles` table.

**Option A: Using Supabase CLI (Recommended)**
```bash
# If you have Supabase CLI installed
supabase db push
```

**Option B: Manual SQL Execution**

Go to your Supabase Dashboard SQL Editor and run the migration file:
- File: `supabase/migrations/20251210_add_user_preferences.sql`

Or copy and paste this SQL:

```sql
-- Add appearance and theme preference columns to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS appearance_mode TEXT DEFAULT 'system' CHECK (appearance_mode IN ('light', 'dark', 'system')),
  ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT 'blue',
  ADD COLUMN IF NOT EXISTS theme_custom_primary TEXT,
  ADD COLUMN IF NOT EXISTS theme_custom_secondary TEXT,
  ADD COLUMN IF NOT EXISTS theme_custom_accent TEXT,
  ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'inter',
  ADD COLUMN IF NOT EXISTS font_size TEXT DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large'));
```

### 2. Set Up Supabase Storage for Profile Pictures

**IMPORTANT:** Storage policies must be created through the Supabase Dashboard UI, not SQL Editor.

Follow the detailed instructions in: `supabase/storage-setup.md`

**Quick Setup:**

**Step 1: Create Bucket**
1. Go to Supabase Dashboard → Storage → Buckets
2. Click "New bucket"
3. Bucket name: `avatars`
4. Set as **Public bucket**: Yes ✅
5. Click "Create bucket"

**Step 2: Create Storage Policies (via Dashboard UI)**

Navigate to: Storage → avatars bucket → Policies tab

Create 4 policies by clicking "New Policy" for each:

**Policy 1: Upload (INSERT)**
- Name: `Users can upload their own avatar`
- Operation: `INSERT`
- Roles: `authenticated`
- WITH CHECK:
```sql
bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
```

**Policy 2: Update (UPDATE)**
- Name: `Users can update their own avatar`
- Operation: `UPDATE`
- Roles: `authenticated`
- USING & WITH CHECK:
```sql
bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
```

**Policy 3: Delete (DELETE)**
- Name: `Users can delete their own avatar`
- Operation: `DELETE`
- Roles: `authenticated`
- USING:
```sql
bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
```

**Policy 4: Public Read (SELECT)**
- Name: `Anyone can view avatars`
- Operation: `SELECT`
- Roles: `public`
- USING:
```sql
bucket_id = 'avatars'
```

**Note:** Do NOT use SQL Editor for storage policies - you'll get a "must be owner of table objects" error.

## Features Implemented

### ✅ User Dropdown in Navbar
- Avatar with user initials fallback
- Dropdown menu with Settings and Logout options
- Dynamic user display name from profile or email

### ✅ Settings Page (`/settings`)
- Two-tab interface: Platform | User Profile
- Platform tab loads by default
- Clean, card-based layout

### ✅ Platform Settings Tab
- **Appearance Mode**: Light, Dark, System (3 button toggles)
- **Theme Color Presets**: 6 color themes (Blue, Purple, Green, Orange, Pink, Teal)
- **Advanced Color Customization**: Custom colors with color pickers (collapsible)
- **Font Family**: Dropdown selector (Inter, Roboto, System, Monospace)
- **Font Size**: Radio buttons (Small, Medium, Large)
- Save button to persist changes

### ✅ User Profile Tab
- **Profile Picture Upload**:
  - Click to upload with file picker
  - Remove button for existing avatars
  - 2MB max size, JPG/PNG/WebP formats
  - Real-time preview
- **Full Name**: Text input with validation
- **Email Update**:
  - With Supabase confirmation flow
  - Warning message when changing email
  - Sends confirmation to both old and new emails
- Save button to persist changes

### ✅ API Routes
- `PUT /api/users/profile` - Update name and email
- `POST /api/users/avatar` - Upload profile picture
- `DELETE /api/users/avatar` - Remove profile picture
- `PUT /api/users/preferences` - Update theme and appearance

### ✅ Theme System
- Theme utility functions in `/src/lib/theme.ts`
- CSS variable application for dynamic theming
- Color presets and custom color support
- Font family and size customization

### ✅ Validation
- Zod schemas for all forms
- Server-side validation in API routes
- Client-side validation in forms
- Error handling with toast notifications

## Testing the Feature

1. Start your development server:
```bash
bun run dev
```

2. Log in to your application

3. Click on your avatar in the navbar (top right)

4. Click "Settings" in the dropdown menu

5. Test the Platform Settings tab:
   - Change appearance mode
   - Select different theme colors
   - Try advanced color customization
   - Change font family and size
   - Click "Save Changes"

6. Test the User Profile tab:
   - Upload a profile picture
   - Update your full name
   - Try changing your email (check for confirmation email)
   - Click "Save Changes"

## Notes

- Theme preferences are stored in the database and persist across devices
- Email changes require confirmation via Supabase's built-in flow
- Profile pictures are stored in Supabase Storage with proper RLS policies
- All forms have proper validation and error handling
- The navbar will automatically update when profile data changes

## Troubleshooting

**Build errors?**
- Run `bun run build` to check for TypeScript errors
- All validation schemas use proper Zod syntax

**Storage bucket not working?**
- Make sure the `avatars` bucket is set to **Public**
- Verify all storage policies are applied
- Check that the bucket name is exactly `avatars`

**Email confirmation not working?**
- Verify Supabase email settings are configured
- Check spam folder for confirmation emails
- Ensure SMTP settings are correct in Supabase Dashboard

**Theme not applying?**
- The theme system uses CSS variables
- Custom implementation may need additional CSS updates
- Check browser console for errors
