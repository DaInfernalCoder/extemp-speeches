# Supabase Backend Setup Guide

## ✅ Completed Implementation

All backend features have been successfully implemented:

- ✅ Database schema with users and speeches tables
- ✅ Row Level Security (RLS) policies on tables and storage
- ✅ Google OAuth authentication
- ✅ Speech submission API with YouTube URL validation
- ✅ Audio file upload via Supabase Storage (max 50 MB)
- ✅ Storage bucket `speech-audio` for audio files
- ✅ Duplicate URL checking per user
- ✅ Weekly and all-time speech tracking
- ✅ Real-time leaderboard updates
- ✅ Auth components and modal UI with tabbed interface

## 🔧 Required Configuration

### 1. Configure Supabase URL Settings

**IMPORTANT**: Before enabling OAuth, configure your redirect URLs:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (fcmxrgdcxcttwgorwpmf)
3. Navigate to **Authentication** → **URL Configuration**
4. Set **Site URL** to your production domain (e.g., `https://yourdomain.com`)
5. Add **Redirect URLs**:
   - `https://yourdomain.com/auth/callback` (production)
   - `http://localhost:3000/auth/callback` (local development)

### 2. Enable Google OAuth in Supabase

1. In Supabase Dashboard, navigate to **Authentication** → **Providers**
2. Find **Google** in the list and click **Enable**
3. You&apos;ll need to:
   - Create a Google OAuth Client in [Google Cloud Console](https://console.cloud.google.com/)
   - Add authorized redirect URIs:
     - `https://fcmxrgdcxcttwgorwpmf.supabase.co/auth/v1/callback` (Supabase callback)
     - `https://yourdomain.com/auth/callback` (production)
     - `http://localhost:3000/auth/callback` (for local development)
   - Copy the Client ID and Client Secret to Supabase

### 3. Configure Storage Bucket (Already Created via Migration)

The `speech-audio` storage bucket has been created via database migration with the following settings:
- **Public access**: Enabled (for playback)
- **File size limit**: 50 MB
- **Allowed MIME types**: All audio formats (audio/*)
- **RLS policies**: 
  - Authenticated users can upload to their own folders
  - Public read access for all audio files
  - Users can delete their own files

If you need to verify or manually create the bucket:
1. Go to **Storage** in Supabase Dashboard
2. Verify `speech-audio` bucket exists
3. Check that RLS policies are enabled

### 4. Enable Realtime (Optional but Recommended)

For live leaderboard updates:

1. In Supabase Dashboard, go to **Database** → **Replication**
2. Enable replication for the `speeches` table
3. This allows the app to receive real-time updates when new speeches are submitted

## 🚀 Running the Application

```bash
# Start development server
npm run dev

# Open browser to http://localhost:3000
```

## 📝 How It Works

### User Flow

1. **Visit the app** → See the leaderboard with weekly and all-time speech counts
2. **Click &quot;Log In&quot;** → Authenticate with Google OAuth
3. **Click &quot;New Speech&quot;** → Choose to submit either:
   - An unlisted YouTube link (YouTube URL tab)
   - Upload an audio file directly (Upload Audio tab, max 50 MB)
4. **Leaderboard updates** → See rankings update in real-time

### Weekly Tracking

- Weeks start on **Monday** at 00:00:00
- The `week_start_date` is calculated and stored with each speech
- Weekly counts reset automatically based on the current week

### Duplicate Prevention

- Users cannot submit the same recording URL twice (YouTube or audio)
- Validation happens on both client and server side
- Error message shown if duplicate is detected

### Audio Upload Features

- **File size limit**: 50 MB (approximately 50 minutes of audio at standard quality)
- **Supported formats**: All audio formats (MP3, M4A, WAV, OGG, AAC, FLAC, etc.)
- **Storage**: Files are stored in Supabase Storage bucket `speech-audio`
- **Organization**: Files are organized by user ID in separate folders
- **Access**: Public read access for playback, authenticated write access only

## 🗂️ Database Schema

### `users` table
- `id` (UUID, references auth.users)
- `email` (TEXT)
- `name` (TEXT)
- `avatar_url` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `email_reminders_enabled` (BOOLEAN, default: true)
- `last_reminder_sent_at` (TIMESTAMPTZ, nullable)
- `focus_area` (TEXT, nullable) - Current focus area for skill improvement
- `current_streak` (INTEGER, default: 0) - Current consecutive days with speech submissions
- `longest_streak` (INTEGER, default: 0) - Highest streak achieved
- `last_streak_date` (DATE, nullable) - Date of last speech submission for streak calculation
- `streak_updated_at` (TIMESTAMPTZ, nullable) - Timestamp of last streak update

### `speeches` table
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key to users)
- `speech_url` (TEXT) - stores either YouTube URL or Supabase Storage URL
- `submitted_at` (TIMESTAMPTZ)
- `week_start_date` (DATE)

### `speech-audio` storage bucket
- Public read access for audio playback
- Authenticated write access (users can upload to their own folders)
- 10 MB file size limit
- Supports all audio MIME types

## 🔐 Security

- Row Level Security (RLS) enabled on all tables
- Authenticated users can only modify their own data
- Anyone can read leaderboard data
- YouTube URL validation prevents invalid submissions

## 🐛 Troubleshooting

### Redirected to localhost in production
- **Cause**: Supabase redirect URLs not configured for production domain
- **Solution**: 
  1. Go to Supabase Dashboard → **Authentication** → **URL Configuration**
  2. Set **Site URL** to your production domain
  3. Add your production callback URL to **Redirect URLs** (e.g., `https://yourdomain.com/auth/callback`)
  4. Also add it to Google Cloud Console authorized redirect URIs

### Google OAuth not working
- Verify redirect URIs in Google Cloud Console
- Check that Google provider is enabled in Supabase
- Ensure environment variables are loaded (restart dev server)
- Verify Supabase URL Configuration includes both production and localhost URLs

### Leaderboard not updating
- Check browser console for errors
- Verify Realtime is enabled in Supabase
- Check that speeches table has replication enabled

### &quot;Unauthorized&quot; errors
- Make sure user is logged in before submitting speeches
- Clear browser cookies and try logging in again
- Verify Supabase auth middleware is working

