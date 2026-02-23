# Settings Feature Architecture Diagram

## 📊 Component Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Navbar (Client)                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Avatar → Dropdown Menu                                  │   │
│  │  - User Info (name, email)                              │   │
│  │  - Settings Link → /settings                            │   │
│  │  - Logout Button                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              /settings Page (Server Component)                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Fetches User + Profile from Supabase                   │   │
│  │  Authentication Check                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Tabs Component                              │   │
│  │  ┌────────────────┬─────────────────┐                   │   │
│  │  │   Platform     │  User Profile   │                   │   │
│  │  │   (default)    │                 │                   │   │
│  │  └────────────────┴─────────────────┘                   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
        │                                   │
        ▼                                   ▼
┌────────────────────────┐      ┌─────────────────────────────┐
│  Platform Settings     │      │  User Profile Settings      │
│  (Client Component)    │      │  (Client Component)         │
├────────────────────────┤      ├─────────────────────────────┤
│                        │      │                             │
│  ┌──────────────────┐ │      │  ┌───────────────────────┐ │
│  │ Appearance Mode  │ │      │  │  Profile Picture      │ │
│  │ - Light          │ │      │  │  - Upload             │ │
│  │ - Dark           │ │      │  │  - Remove             │ │
│  │ - System         │ │      │  │  (Avatar Component)   │ │
│  └──────────────────┘ │      │  └───────────────────────┘ │
│                        │      │                             │
│  ┌──────────────────┐ │      │  ┌───────────────────────┐ │
│  │ Theme Colors     │ │      │  │  Full Name Input      │ │
│  │ - Blue (default) │ │      │  │  (Text Field)         │ │
│  │ - Purple         │ │      │  └───────────────────────┘ │
│  │ - Green          │ │      │                             │
│  │ - Orange         │ │      │  ┌───────────────────────┐ │
│  │ - Pink           │ │      │  │  Email Input          │ │
│  │ - Teal           │ │      │  │  (Email Field)        │ │
│  └──────────────────┘ │      │  │  + Warning Alert      │ │
│                        │      │  └───────────────────────┘ │
│  ┌──────────────────┐ │      │                             │
│  │ Advanced Colors  │ │      │  ┌───────────────────────┐ │
│  │ (Collapsible)    │ │      │  │  Save Button          │ │
│  │ - Primary        │ │      │  └───────────────────────┘ │
│  │ - Secondary      │ │      │           │                 │
│  │ - Accent         │ │      │           ▼                 │
│  │ (Color Pickers)  │ │      │  PUT /api/users/profile    │
│  └──────────────────┘ │      │  POST /api/users/avatar    │
│                        │      │  DELETE /api/users/avatar  │
│  ┌──────────────────┐ │      └─────────────────────────────┘
│  │ Font Settings    │ │
│  │ - Family         │ │
│  │   (Select)       │ │
│  │ - Size           │ │
│  │   (Radio Group)  │ │
│  └──────────────────┘ │
│                        │
│  ┌──────────────────┐ │
│  │  Save Button     │ │
│  └──────────────────┘ │
│           │            │
│           ▼            │
│  PUT /api/users/       │
│      preferences       │
└────────────────────────┘
```

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Side                              │
└─────────────────────────────────────────────────────────────────┘
                                │
                        (1) Form Submit
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Routes (Server)                         │
│                                                                   │
│  PUT /api/users/profile                                          │
│  ├─ Validate with UpdateProfileSchema (Zod)                     │
│  ├─ Check Authentication (Supabase)                             │
│  ├─ Update email via auth.updateUser() if changed              │
│  ├─ Update profiles table                                       │
│  ├─ revalidatePath('/settings')                                 │
│  └─ Return success/error                                        │
│                                                                   │
│  POST /api/users/avatar                                          │
│  ├─ Parse multipart/form-data                                   │
│  ├─ Validate file (size, type)                                  │
│  ├─ Check Authentication                                         │
│  ├─ Delete old avatar from storage                              │
│  ├─ Upload new avatar to storage                                │
│  ├─ Get public URL                                              │
│  ├─ Update profiles.avatar_url                                  │
│  ├─ revalidatePath('/settings')                                 │
│  └─ Return avatar URL                                           │
│                                                                   │
│  DELETE /api/users/avatar                                        │
│  ├─ Check Authentication                                         │
│  ├─ Delete avatar from storage                                  │
│  ├─ Set profiles.avatar_url = null                             │
│  ├─ revalidatePath('/settings')                                 │
│  └─ Return success                                              │
│                                                                   │
│  PUT /api/users/preferences                                      │
│  ├─ Validate with UpdatePreferencesSchema (Zod)                │
│  ├─ Check Authentication                                         │
│  ├─ Update all preference columns in profiles                   │
│  ├─ revalidatePath('/settings')                                 │
│  └─ Return success                                              │
└─────────────────────────────────────────────────────────────────┘
                                │
                        (2) Database Operation
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Supabase Backend                            │
│                                                                   │
│  ┌────────────────────┐    ┌──────────────────────┐            │
│  │  Authentication    │    │  Database (Postgres) │            │
│  │  - auth.users      │◄───┤  - profiles table    │            │
│  │  - getUser()       │    │    * appearance_mode │            │
│  │  - updateUser()    │    │    * theme_color     │            │
│  └────────────────────┘    │    * font_family     │            │
│                             │    * font_size       │            │
│  ┌────────────────────┐    │    * avatar_url      │            │
│  │  Storage           │    │    * email           │            │
│  │  - avatars bucket  │    │    * full_name       │            │
│  │  - RLS policies    │    │    * (customs...)    │            │
│  │  - Public access   │    └──────────────────────┘            │
│  └────────────────────┘                                         │
│                                                                   │
│  ┌────────────────────────────────────────────┐                 │
│  │  RLS Policies (Row Level Security)         │                 │
│  │  - Users can only access own data          │                 │
│  │  - Storage policies for avatar CRUD        │                 │
│  │  - Public read for avatar display          │                 │
│  └────────────────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                        (3) Response
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Client Side                              │
│                                                                   │
│  - Display toast notification (Sonner)                           │
│  - Update local state                                            │
│  - router.refresh() to revalidate server components              │
│  - Apply theme if preferences changed                            │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 File Structure

```
studygenius/
│
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   └── settings/
│   │   │       └── page.tsx ......................... Main Settings Page (Server)
│   │   │
│   │   └── api/
│   │       └── users/
│   │           ├── profile/
│   │           │   └── route.ts ...................... PUT - Update profile
│   │           ├── avatar/
│   │           │   └── route.ts ...................... POST/DELETE - Avatar
│   │           └── preferences/
│   │               └── route.ts ...................... PUT - Update preferences
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   └── navbar.tsx ........................... Enhanced with dropdown
│   │   │
│   │   ├── settings/
│   │   │   ├── platform-settings.tsx ................ Platform Settings Tab
│   │   │   └── user-profile-settings.tsx ............ User Profile Tab
│   │   │
│   │   └── ui/
│   │       ├── avatar.tsx ........................... shadcn
│   │       ├── dropdown-menu.tsx .................... shadcn
│   │       ├── tabs.tsx ............................. shadcn
│   │       ├── card.tsx ............................. shadcn
│   │       ├── button.tsx ........................... shadcn
│   │       ├── input.tsx ............................ shadcn
│   │       ├── label.tsx ............................ shadcn
│   │       ├── select.tsx ........................... shadcn (NEW)
│   │       ├── radio-group.tsx ...................... shadcn (NEW)
│   │       ├── alert.tsx ............................ shadcn
│   │       └── separator.tsx ........................ shadcn
│   │
│   └── lib/
│       ├── validations.ts ........................... Extended with schemas
│       ├── theme.ts ................................. Theme utilities (NEW)
│       └── supabase/
│           ├── client.ts ............................ Browser client
│           └── server.ts ............................ Server client
│
├── supabase/
│   ├── migrations/
│   │   └── 20251210_add_user_preferences.sql ........ Database migration
│   │
│   └── storage-setup.md ............................. Storage setup guide
│
├── SETUP_INSTRUCTIONS.md ............................ Setup guide
├── IMPLEMENTATION_SUMMARY.md ........................ This summary
├── ARCHITECTURE_DIAGRAM.md .......................... Architecture (this file)
└── todo.md .......................................... Updated with completion
```

## 🔐 Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Security Layers                            │
└─────────────────────────────────────────────────────────────────┘

Layer 1: Client-Side Validation
├─ Zod schemas validate input before submission
├─ File type/size checks before upload
├─ Hex color format validation
└─ Required field validation

                    ↓

Layer 2: API Route Authentication
├─ supabase.auth.getUser() checks authentication
├─ Returns 401 if not authenticated
├─ User ID from auth token (not request)
└─ No access to other users' data

                    ↓

Layer 3: Input Validation (Server)
├─ Zod schemas validate all inputs
├─ Type safety with TypeScript
├─ Regex patterns for special formats
└─ Returns 400 for invalid input

                    ↓

Layer 4: Database Row-Level Security
├─ RLS policies on profiles table
├─ Users can only access own row
├─ Enforced at database level
└─ Cannot be bypassed

                    ↓

Layer 5: Storage Security
├─ RLS policies on storage.objects
├─ Users upload to own folder: avatars/{user_id}/
├─ Cannot access other users' folders
├─ Public read for avatar display
└─ Authenticated write/delete only

                    ↓

Layer 6: Email Verification
├─ Supabase handles email confirmation
├─ Tokens sent to both old and new emails
├─ Change only applied after confirmation
└─ Protection against email hijacking
```

## 🎨 UI Component Hierarchy

```
Settings Page
└─ Tabs
    ├─ TabsList
    │   ├─ TabsTrigger: "Platform"
    │   └─ TabsTrigger: "User Profile"
    │
    ├─ TabsContent: "platform"
    │   └─ PlatformSettings
    │       ├─ Card: Appearance
    │       │   └─ 3 Button Toggles (Light/Dark/System)
    │       │
    │       ├─ Card: Theme Colors
    │       │   ├─ 6 Color Preset Buttons
    │       │   ├─ Separator
    │       │   └─ Collapsible: Advanced
    │       │       ├─ Input: Primary (color + text)
    │       │       ├─ Input: Secondary (color + text)
    │       │       └─ Input: Accent (color + text)
    │       │
    │       ├─ Card: Font Settings
    │       │   ├─ Select: Font Family
    │       │   └─ RadioGroup: Font Size
    │       │
    │       └─ Button: Save Changes
    │
    └─ TabsContent: "profile"
        └─ UserProfileSettings
            ├─ Card: Profile Picture
            │   ├─ Avatar (large)
            │   ├─ Button: Upload Photo
            │   ├─ Button: Remove (conditional)
            │   └─ Input: File (hidden)
            │
            ├─ Card: Profile Information
            │   └─ Form
            │       ├─ Input: Full Name
            │       ├─ Input: Email
            │       ├─ Alert: Email Change Warning (conditional)
            │       └─ Button: Save Changes
            │
            └─ (Future: More cards...)
```

## 🔄 State Management

```
Platform Settings Component
├─ Local State (useState):
│   ├─ isLoading (boolean)
│   ├─ showAdvanced (boolean)
│   ├─ appearanceMode (string)
│   ├─ themeColor (string)
│   ├─ customPrimary (string)
│   ├─ customSecondary (string)
│   ├─ customAccent (string)
│   ├─ fontFamily (string)
│   └─ fontSize (string)
│
└─ Methods:
    ├─ handleSave() → API call → toast → router.refresh()
    └─ applyTheme() → Updates CSS variables

User Profile Settings Component
├─ Local State (useState):
│   ├─ isLoading (boolean)
│   ├─ isUploadingAvatar (boolean)
│   ├─ fullName (string)
│   ├─ email (string)
│   └─ avatarUrl (string)
│
├─ Refs (useRef):
│   └─ fileInputRef (HTMLInputElement)
│
└─ Methods:
    ├─ handleProfileUpdate() → API call → toast → router.refresh()
    ├─ handleAvatarUpload() → API call → toast → router.refresh()
    └─ handleAvatarRemove() → API call → toast → router.refresh()
```

## 📊 Database Schema (Extended)

```sql
profiles
├─ id (UUID, PRIMARY KEY) → references auth.users
├─ email (TEXT)
├─ full_name (TEXT)
├─ avatar_url (TEXT) ........................ Supabase Storage URL
├─ subscription_tier (TEXT) ................. free/plus/pro
│
├─ appearance_mode (TEXT) ................... NEW: light/dark/system
├─ theme_color (TEXT) ....................... NEW: blue/purple/etc
├─ theme_custom_primary (TEXT) .............. NEW: #RRGGBB or null
├─ theme_custom_secondary (TEXT) ............ NEW: #RRGGBB or null
├─ theme_custom_accent (TEXT) ............... NEW: #RRGGBB or null
├─ font_family (TEXT) ....................... NEW: inter/roboto/etc
├─ font_size (TEXT) ......................... NEW: small/medium/large
│
├─ created_at (TIMESTAMPTZ)
└─ updated_at (TIMESTAMPTZ)
```

## 🚀 Performance Optimizations

1. **Server-Side Rendering:**

   - Settings page fetches data on server
   - Reduces client-side loading time
   - Better perceived performance

2. **Revalidation Strategy:**

   - Uses `revalidatePath()` instead of full page reload
   - Only revalidates affected routes
   - Maintains scroll position

3. **Optimistic Updates:**

   - Could add optimistic UI updates (future enhancement)
   - Current implementation prioritizes data consistency

4. **Image Optimization:**

   - Avatars stored in Supabase CDN
   - Automatic caching
   - Could add Next.js Image optimization (future)

5. **Code Splitting:**
   - Settings components lazy-loaded via tabs
   - Only active tab code is executed
   - Reduces initial bundle size

## 🎯 Future Expansion Points

```
Current Settings Structure
└─ Settings Page
    ├─ Platform Tab ............................ ✅ Implemented
    │   ├─ Appearance ......................... ✅ Complete
    │   ├─ Theme Colors ....................... ✅ Complete
    │   └─ Font Settings ...................... ✅ Complete
    │
    ├─ User Profile Tab ........................ ✅ Implemented
    │   ├─ Profile Picture .................... ✅ Complete
    │   ├─ Full Name .......................... ✅ Complete
    │   └─ Email .............................. ✅ Complete
    │
    └─ Future Tabs (Easy to Add):
        ├─ Account Security
        │   ├─ Change Password
        │   ├─ Two-Factor Authentication
        │   └─ Active Sessions
        │
        ├─ Notifications
        │   ├─ Email Preferences
        │   ├─ Push Notifications
        │   └─ Notification Frequency
        │
        ├─ Privacy
        │   ├─ Profile Visibility
        │   ├─ Data Sharing
        │   └─ Delete Account
        │
        └─ Integrations
            ├─ Connected Apps
            ├─ API Keys
            └─ Webhooks
```

---

**Note:** This architecture is designed to be extensible and maintainable, following modern Next.js patterns and best practices.
