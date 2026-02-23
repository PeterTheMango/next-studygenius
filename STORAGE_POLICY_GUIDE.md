# Quick Guide: Setting Up Storage Policies in Supabase Dashboard

## ⚠️ Important Note
**DO NOT use SQL Editor for storage policies!** You'll get this error:
```
ERROR: 42501: must be owner of table objects
```

Storage policies MUST be created through the Supabase Dashboard UI.

## Step-by-Step Visual Guide

### 1. Navigate to Storage Policies

```
Supabase Dashboard
└── Storage (left sidebar)
    └── Buckets
        └── avatars (click on it)
            └── Policies tab (top)
                └── "New Policy" button
```

### 2. Create Each Policy

You need to create **4 separate policies**. Here's how:

---

## Policy 1: Allow Upload

**Click "New Policy" → "Create a policy from scratch"**

| Field | Value |
|-------|-------|
| **Policy Name** | `Users can upload their own avatar` |
| **Allowed Operation** | `INSERT` |
| **Target Roles** | `authenticated` |
| **USING expression** | Leave empty |
| **WITH CHECK expression** | `bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text` |

Click **Review** → **Save policy**

---

## Policy 2: Allow Update

**Click "New Policy" → "Create a policy from scratch"**

| Field | Value |
|-------|-------|
| **Policy Name** | `Users can update their own avatar` |
| **Allowed Operation** | `UPDATE` |
| **Target Roles** | `authenticated` |
| **USING expression** | `bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text` |
| **WITH CHECK expression** | `bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text` |

Click **Review** → **Save policy**

---

## Policy 3: Allow Delete

**Click "New Policy" → "Create a policy from scratch"**

| Field | Value |
|-------|-------|
| **Policy Name** | `Users can delete their own avatar` |
| **Allowed Operation** | `DELETE` |
| **Target Roles** | `authenticated` |
| **USING expression** | `bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text` |
| **WITH CHECK expression** | Leave empty |

Click **Review** → **Save policy**

---

## Policy 4: Allow Public Read

**Click "New Policy" → "Create a policy from scratch"**

| Field | Value |
|-------|-------|
| **Policy Name** | `Anyone can view avatars` |
| **Allowed Operation** | `SELECT` |
| **Target Roles** | `public` |
| **USING expression** | `bucket_id = 'avatars'` |
| **WITH CHECK expression** | Leave empty |

Click **Review** → **Save policy**

---

## 3. Verify Your Setup

After creating all policies, your Policies tab should show:

```
✅ Users can upload their own avatar      [INSERT]    authenticated
✅ Users can update their own avatar      [UPDATE]    authenticated
✅ Users can delete their own avatar      [DELETE]    authenticated
✅ Anyone can view avatars                [SELECT]    public
```

## Understanding the Policy Logic

### Why `(storage.foldername(name))[1] = auth.uid()::text`?

This ensures that:
- Files are stored in folders named after user IDs: `avatars/{user_id}/filename.jpg`
- Users can only access files in their own folder
- User `abc-123` can only upload/update/delete files in `avatars/abc-123/`
- User `xyz-789` cannot access files in `avatars/abc-123/`

### Why is SELECT policy different?

The `SELECT` policy allows anyone (public role) to **view** avatars. This is necessary so:
- Profile pictures can be displayed to other users
- Avatar URLs work in the application
- Public read access doesn't compromise security (users still can't modify others' files)

## Troubleshooting

### Error: "must be owner of table objects"
- ❌ You tried to run policies in SQL Editor
- ✅ Use the Dashboard UI instead (Storage → Policies tab)

### Error: "Policy already exists"
- You're trying to create a duplicate policy
- Check the Policies tab to see existing policies
- Delete the old one first, or use a different name

### Avatars not uploading
- Check that the bucket is set to **Public** (not Private)
- Verify all 4 policies are created
- Check browser console for specific error messages

### Avatars not displaying
- Ensure the SELECT policy for `public` role is created
- Verify the bucket is **Public**
- Check that `getPublicUrl()` is being used in the code

## Testing Your Setup

Once policies are created, test by:

1. Start your app: `bun run dev`
2. Log in and go to Settings
3. Try uploading a profile picture
4. Check Supabase Storage → avatars bucket to see the uploaded file
5. The file should be in: `avatars/{your-user-id}/avatar-{timestamp}.{ext}`

## Common Mistakes to Avoid

1. ❌ Using SQL Editor for storage policies
2. ❌ Setting bucket to Private instead of Public
3. ❌ Forgetting to create the SELECT policy for public read
4. ❌ Missing the auth.uid() check in policies
5. ❌ Typos in bucket_id (must be exactly `avatars`)

## Need Help?

If you're still stuck:
1. Double-check bucket name is exactly `avatars`
2. Verify bucket is set to **Public**
3. Ensure you have all 4 policies created
4. Check the exact policy expressions match the examples above
5. Try deleting and recreating the policies

---

**Remember:** The Dashboard UI is your friend for storage policies! 🎉
