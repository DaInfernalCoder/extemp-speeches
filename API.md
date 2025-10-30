# API Documentation

## Endpoints

### POST `/api/speeches/submit`

Submit a new speech with a YouTube URL.

**Authentication**: Required (Bearer token via Supabase Auth)

**Request Body**:
```json
{
  &quot;youtube_url&quot;: &quot;https://youtube.com/watch?v=...&quot;
}
```

**Success Response** (201):
```json
{
  &quot;success&quot;: true,
  &quot;data&quot;: {
    &quot;id&quot;: &quot;uuid&quot;,
    &quot;user_id&quot;: &quot;uuid&quot;,
    &quot;youtube_url&quot;: &quot;https://youtube.com/watch?v=...&quot;,
    &quot;submitted_at&quot;: &quot;2025-10-30T12:00:00Z&quot;,
    &quot;week_start_date&quot;: &quot;2025-10-27&quot;
  }
}
```

**Error Responses**:

- **401 Unauthorized**: User not logged in
```json
{
  &quot;error&quot;: &quot;Unauthorized&quot;
}
```

- **400 Bad Request**: Invalid YouTube URL
```json
{
  &quot;error&quot;: &quot;Invalid YouTube URL format. Please provide a valid YouTube link.&quot;
}
```

- **409 Conflict**: Duplicate URL
```json
{
  &quot;error&quot;: &quot;You have already submitted this YouTube URL&quot;
}
```

**Validation Rules**:
- URL must be a valid YouTube URL (youtube.com/watch?v= or youtu.be/)
- URL must not have been previously submitted by the same user
- User must be authenticated

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

