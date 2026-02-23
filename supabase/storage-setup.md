# Supabase Storage Setup for Profile Pictures

## Manual Setup Required in Supabase Dashboard

### Step 1: Create Storage Bucket

1. **Go to Storage in Supabase Dashboard**
   - Navigate to: Storage → Buckets
   - Or: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/storage/buckets

2. **Create a new bucket named `avatars`**
   - Click "New bucket"
   - Bucket name: `avatars`
   - Public bucket: **Yes** ✅ (IMPORTANT: Must be public for avatar display)
   - Click "Create bucket"

### Step 2: Configure Storage Policies (Using Dashboard - RECOMMENDED)

**Important:** Storage policies must be created through the Supabase Dashboard UI, not SQL Editor.

1. **Go to Storage Policies**
   - Click on the `avatars` bucket
   - Click "Policies" tab at the top
   - Click "New Policy"

2. **Create Policy 1: Upload Own Avatar**
   - Click "Create a policy from scratch"
   - Policy name: `Users can upload their own avatar`
   - Allowed operation: `INSERT`
   - Target roles: `authenticated`
   - USING expression: Leave empty
   - WITH CHECK expression:
     ```sql
     bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
     ```
   - Click "Review" → "Save policy"

3. **Create Policy 2: Update Own Avatar**
   - Click "New Policy" → "Create a policy from scratch"
   - Policy name: `Users can update their own avatar`
   - Allowed operation: `UPDATE`
   - Target roles: `authenticated`
   - USING expression:
     ```sql
     bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
     ```
   - WITH CHECK expression:
     ```sql
     bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
     ```
   - Click "Review" → "Save policy"

4. **Create Policy 3: Delete Own Avatar**
   - Click "New Policy" → "Create a policy from scratch"
   - Policy name: `Users can delete their own avatar`
   - Allowed operation: `DELETE`
   - Target roles: `authenticated`
   - USING expression:
     ```sql
     bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
     ```
   - WITH CHECK expression: Leave empty
   - Click "Review" → "Save policy"

5. **Create Policy 4: Public Read Access**
   - Click "New Policy" → "Create a policy from scratch"
   - Policy name: `Anyone can view avatars`
   - Allowed operation: `SELECT`
   - Target roles: `public`
   - USING expression:
     ```sql
     bucket_id = 'avatars'
     ```
   - WITH CHECK expression: Leave empty
   - Click "Review" → "Save policy"

### Alternative: Using Storage Policy Templates (Easier)

If you prefer using templates:

1. Click "New Policy" on the avatars bucket
2. Select "Allow authenticated users to insert objects"
3. Modify the policy to match the expressions above
4. Repeat for UPDATE, DELETE, and SELECT operations

### Verify Setup

After creating all policies, you should see 4 policies in the Policies tab:
- ✅ Users can upload their own avatar (INSERT, authenticated)
- ✅ Users can update their own avatar (UPDATE, authenticated)
- ✅ Users can delete their own avatar (DELETE, authenticated)
- ✅ Anyone can view avatars (SELECT, public)

## File Structure
Files will be stored as: `avatars/{user_id}/{filename}`

Example: `avatars/123e4567-e89b-12d3-a456-426614174000/profile.jpg`

## Usage in Code
```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// Upload
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/profile.jpg`, file)

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('avatars')
  .getPublicUrl(`${userId}/profile.jpg`)
```
