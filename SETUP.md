# Supabase Backend Setup Guide

## ✅ Completed Implementation

All backend features have been successfully implemented:

- ✅ Database schema with users and speeches tables
- ✅ Row Level Security (RLS) policies
- ✅ Google OAuth authentication
- ✅ Speech submission API with YouTube URL validation
- ✅ Duplicate URL checking per user
- ✅ Weekly and all-time speech tracking
- ✅ Real-time leaderboard updates
- ✅ Auth components and modal UI

## 🔧 Required Configuration

### 1. Enable Google OAuth in Supabase

You need to configure Google OAuth provider in your Supabase project:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (fcmxrgdcxcttwgorwpmf)
3. Navigate to **Authentication** → **Providers**
4. Find **Google** in the list and click **Enable**
5. You&apos;ll need to:
   - Create a Google OAuth Client in [Google Cloud Console](https://console.cloud.google.com/)
   - Add authorized redirect URIs:
     - `https://fcmxrgdcxcttwgorwpmf.supabase.co/auth/v1/callback`
     - `http://localhost:3000/auth/callback` (for local development)
   - Copy the Client ID and Client Secret to Supabase

### 2. Enable Realtime (Optional but Recommended)

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
3. **Click &quot;New Speech&quot;** → Submit an unlisted YouTube link
4. **Leaderboard updates** → See rankings update in real-time

### Weekly Tracking

- Weeks start on **Monday** at 00:00:00
- The `week_start_date` is calculated and stored with each speech
- Weekly counts reset automatically based on the current week

### Duplicate Prevention

- Users cannot submit the same YouTube URL twice
- Validation happens on both client and server side
- Error message shown if duplicate is detected

## 🗂️ Database Schema

### `users` table
- `id` (UUID, references auth.users)
- `email` (TEXT)
- `name` (TEXT)
- `avatar_url` (TEXT)
- `created_at` (TIMESTAMPTZ)

### `speeches` table
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key to users)
- `youtube_url` (TEXT)
- `submitted_at` (TIMESTAMPTZ)
- `week_start_date` (DATE)

## 🔐 Security

- Row Level Security (RLS) enabled on all tables
- Authenticated users can only modify their own data
- Anyone can read leaderboard data
- YouTube URL validation prevents invalid submissions

## 🐛 Troubleshooting

### Google OAuth not working
- Verify redirect URIs in Google Cloud Console
- Check that Google provider is enabled in Supabase
- Ensure environment variables are loaded (restart dev server)

### Leaderboard not updating
- Check browser console for errors
- Verify Realtime is enabled in Supabase
- Check that speeches table has replication enabled

### &quot;Unauthorized&quot; errors
- Make sure user is logged in before submitting speeches
- Clear browser cookies and try logging in again
- Verify Supabase auth middleware is working

