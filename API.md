# API Documentation

## Endpoints

### POST `/api/speeches/submit`

Submit a new speech with a YouTube URL or audio file upload.

**Authentication**: Required (Bearer token via Supabase Auth)

#### Option 1: Submit YouTube URL

**Content-Type**: `application/json`

**Request Body**:
```json
{
  &quot;speech_url&quot;: &quot;https://youtube.com/watch?v=...&quot;
}
```

**Success Response** (201):
```json
{
  &quot;success&quot;: true,
  &quot;data&quot;: {
    &quot;id&quot;: &quot;uuid&quot;,
    &quot;user_id&quot;: &quot;uuid&quot;,
    &quot;speech_url&quot;: &quot;https://youtube.com/watch?v=...&quot;,
    &quot;submitted_at&quot;: &quot;2025-10-30T12:00:00Z&quot;,
    &quot;week_start_date&quot;: &quot;2025-10-27&quot;
  }
}
```

**Validation Rules**:
- URL must be a valid YouTube URL (youtube.com/watch?v= or youtu.be/)
- URL must not have been previously submitted by the same user
- User must be authenticated

#### Option 2: Upload Audio File

**Content-Type**: `multipart/form-data`

**Request Body**:
- `audio_file`: Audio file (File object)

**Success Response** (201):
```json
{
  &quot;success&quot;: true,
  &quot;data&quot;: {
    &quot;id&quot;: &quot;uuid&quot;,
    &quot;user_id&quot;: &quot;uuid&quot;,
    &quot;speech_url&quot;: &quot;https://[project-id].supabase.co/storage/v1/object/public/speech-audio/...&quot;,
    &quot;submitted_at&quot;: &quot;2025-10-30T12:00:00Z&quot;,
    &quot;week_start_date&quot;: &quot;2025-10-27&quot;
  }
}
```

**Validation Rules**:
- File must be an audio file (audio/*)
- File size must be less than 10 MB
- File is uploaded to Supabase Storage bucket `speech-audio`
- User must be authenticated

#### Error Responses

- **401 Unauthorized**: User not logged in
```json
{
  &quot;error&quot;: &quot;Unauthorized&quot;
}
```

- **400 Bad Request**: Invalid YouTube URL or audio file
```json
{
  &quot;error&quot;: &quot;Invalid YouTube URL format. Please provide a valid YouTube link.&quot;
}
```
```json
{
  &quot;error&quot;: &quot;Audio file must be less than 10 MB&quot;
}
```
```json
{
  &quot;error&quot;: &quot;Invalid file type. Please upload an audio file.&quot;
}
```

- **409 Conflict**: Duplicate recording
```json
{
  &quot;error&quot;: &quot;You have already submitted this recording&quot;
}
```

- **500 Internal Server Error**: Failed to upload
```json
{
  &quot;error&quot;: &quot;Failed to upload audio file&quot;
}
```

---

### GET `/api/leaderboard`

Fetch the current leaderboard with weekly and all-time statistics.

**Authentication**: Not required (public endpoint)

**Success Response** (200):
```json
{
  &quot;data&quot;: [
    {
      &quot;name&quot;: &quot;John Doe&quot;,
      &quot;place&quot;: 1,
      &quot;all_time_speeches&quot;: 15,
      &quot;weekly_speeches&quot;: 3,
      &quot;avatar_url&quot;: &quot;https://...&quot;
    },
    {
      &quot;name&quot;: &quot;Jane Smith&quot;,
      &quot;place&quot;: 2,
      &quot;all_time_speeches&quot;: 12,
      &quot;weekly_speeches&quot;: 2,
      &quot;avatar_url&quot;: &quot;https://...&quot;
    }
  ]
}
```

**Response Fields**:
- `name`: User&apos;s display name
- `place`: Current ranking (based on all_time_speeches)
- `all_time_speeches`: Total number of speeches ever submitted
- `weekly_speeches`: Number of speeches submitted this week (Monday-Sunday)
- `avatar_url`: User&apos;s profile picture from Google OAuth (optional)
- `speech_urls`: Array of URLs to speech recordings (YouTube or Supabase Storage)

**Notes**:
- Results are sorted by `all_time_speeches` in descending order
- Weekly count is based on the current week (starts Monday at 00:00:00)
- Users with no speeches are included with counts of 0

---

## Real-time Updates

The leaderboard supports real-time updates using Supabase Realtime:

```typescript
const supabase = createClient();

const channel = supabase
  .channel(&apos;speeches-changes&apos;)
  .on(&apos;postgres_changes&apos;, 
    { event: &apos;*&apos;, schema: &apos;public&apos;, table: &apos;speeches&apos; }, 
    () => {
      // Refetch leaderboard data
    }
  )
  .subscribe();
```

Events triggered on:
- New speech submission (INSERT)
- Speech update (UPDATE) 
- Speech deletion (DELETE)

---

## Authentication

### Login Flow

1. User clicks &quot;Log In&quot; button
2. Redirected to Google OAuth consent screen
3. After approval, redirected to `/auth/callback`
4. Callback handler:
   - Exchanges code for session
   - Creates/updates user profile in `users` table
   - Redirects to home page
5. Session persisted via HTTP-only cookies

### Session Management

- Sessions automatically refreshed by middleware
- Session duration: as configured in Supabase (default 1 hour with 24h refresh)
- Logout clears session cookies

---

## Error Handling

All endpoints follow consistent error response format:

```json
{
  &quot;error&quot;: &quot;Error message description&quot;
}
```

Common HTTP status codes:
- `200`: Success (GET)
- `201`: Created (POST)
- `400`: Bad Request (validation error)
- `401`: Unauthorized (authentication required)
- `409`: Conflict (duplicate resource)
- `500`: Internal Server Error (server-side issue)

