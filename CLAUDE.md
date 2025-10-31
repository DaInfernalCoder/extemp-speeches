# CLAUDE.md

IMPORTANT: always update claude.md if necessary if something changes and certain parts become out of date because of your changes

to test out if it works, try 

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an extemporaneous speeches leaderboard application built with Next.js 16, React 19, TypeScript, and Supabase. The app displays a competitive leaderboard showing speakers' rankings with both weekly and all-time speech counts. Users can log in with Google OAuth and submit their speech recordings by uploading videos directly to Cloudflare Stream or by uploading audio files to Supabase storage.

## Development Commands

```bash
# Start development server (runs on http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run ESLint
npm run lint
```

## Architecture

### Next.js App Router (v16)

This project uses Next.js 16's App Router architecture:
- **app/layout.tsx**: Root layout defining global structure, fonts (Geist Sans/Mono), and metadata
- **app/page.tsx**: Home page that renders the LeaderBoard component
- **app/components/**: React components (currently contains LeaderBoard.tsx)
- **app/globals.css**: Global styles using Tailwind CSS v4 syntax

### Tailwind CSS v4

This project uses **Tailwind CSS v4**, which has different syntax than v3:
- Uses `@import "tailwindcss"` instead of separate directives
- Uses `@theme inline` for custom theme configuration
- Configured through [postcss.config.mjs](postcss.config.mjs) with `@tailwindcss/postcss` plugin

### Neobrutalist Design System

The application uses a **neobrutalist design language** inspired by modern design trends. Key characteristics:

**Color Palette** ([app/globals.css](app/globals.css)):
- Background: Warm cream (`#FFF8F0`)
- Foreground: Dark charcoal (`#1a1a1a`)
- Border: Pure black (`#000000`)
- Primary accent: Vibrant blue (`#0066FF`)
- Secondary accent: Bright yellow (`#FFD233`)
- Additional accents: Pink (`#FF6B9D`), Teal (`#00CDB8`), Purple (`#B794F6`)
- Status colors: Success green (`#00D9A0`), Error red (`#FF4757`)

**Design Elements**:
- **Thick black borders**: 3-4px solid black borders on all interactive elements
- **Hard shadows**: Offset box shadows (e.g., `4px 4px 0px #000`) with no blur
- **Flat colors**: Solid color fills, no gradients (except on podium for visual hierarchy)
- **Bold typography**: Heavy font weights (700-800) for headings, medium (400-500) for body text
- **Rounded corners**: Subtle border radius (8-12px) - not completely square
- **High contrast**: Strong visual separation between elements

**Utility Classes** ([app/globals.css](app/globals.css)):
- `.brutal-border`: 3px solid black border
- `.brutal-border-thick`: 4px solid black border
- `.brutal-shadow`: Standard hard shadow (4px 4px 0px #000)
- `.brutal-shadow-lg`: Large hard shadow (6px 6px 0px #000)
- `.brutal-shadow-hover`: Hover state shadow (2px 2px 0px #000)
- `.brutal-card`: Pre-styled card with border, shadow, and rounded corners
- `.brutal-button`: Interactive button with border, shadow, and hover effects

**Component Styling Patterns**:
- **Buttons**: Thick borders, hard shadows that shift on hover (shadow translates down/right on press)
- **Modals**: Cards with `brutal-card` class, thick borders, and prominent shadows
- **Forms**: Inputs with 3px black borders, white backgrounds, no focus rings (use thick black outline instead)
- **Tables**: Grid lines with 3px black borders between cells and rows
- **Progress bars**: White backgrounds with thick borders, colored fills
- **Links**: Bold text with primary color, underline on hover
- **Sliders**: Custom styled with square/rounded thumbs, thick borders, and hard shadows

**Interaction Design**:
- Hover states shift shadows from `4px 4px` to `2px 2px` with transform
- Active states shift shadows to `1px 1px` with larger transform
- Transitions are snappy (150ms) for immediate feedback
- No opacity changes - use shadow/transform instead

### TypeScript Configuration

- **Path alias**: `@/*` maps to the root directory (e.g., `@/app/components/Foo`)
- **Strict mode enabled**: All code must pass strict TypeScript checks
- **Target**: ES2017
- **JSX**: Uses react-jsx transform

### Supabase Backend

The application uses **Supabase** for authentication, data storage, and file storage:
- **Database Tables**:
  - `users`: Stores user profiles (synced with auth.users), includes `email_reminders_enabled` and `last_reminder_sent_at` fields
  - `speeches`: Stores speech submissions with speech URLs and week tracking
  - `ballots`: Stores speech reviews with multiple criteria ratings (1-10 scale), feedback text, and comparison flags
  - `feature_requests`: Stores user-submitted feature requests with title and description
- **Storage Buckets**:
  - `speech-audio`: Stores uploaded audio files (public read, authenticated write, 50 MB limit)
- **Authentication**: Google OAuth via Supabase Auth (no provider-specific scopes required - used for authentication only)
- **Real-time**: Leaderboard and ballots update live when speeches or ballots are submitted
- **RLS (Row Level Security)**: Enabled on all tables and storage buckets for security

Configuration:
- Supabase client utilities in [lib/supabase/](lib/supabase/)
- Environment variables in `.env.local` (not committed)
- Middleware for auth session refresh in [middleware.ts](middleware.ts)

### Email Notifications

The application uses **Resend** for email delivery:
- **Email Service**: Resend API for sending transactional and reminder emails
- **Email Templates**: Located in [lib/resend.ts](lib/resend.ts) with functions for:
  - `sendDailyReminderEmail()`: Daily reminder for users who haven't submitted a speech
  - `sendBallotNotificationEmail()`: Notification when a user receives feedback on their speech
  - `sendSpeechSubmissionAlert()`: Alert to coaches when a new speech is submitted
  - `sendFeatureRequestAlert()`: Alert for new feature requests
- **Scheduled Emails**: Daily reminders are triggered via Supabase pg_cron job calling the `/api/emails/daily-reminder` endpoint
- **Configuration**:
  - Requires `RESEND_API_KEY` environment variable
  - From address: `yourextempcoaches@resend.dev`
  - Email links base URL resolution order:
    1. `NEXT_PUBLIC_SITE_URL` (recommended to set to `https://extemp-speeches.vercel.app/` in production)
    2. `VERCEL_URL` (auto-provided by Vercel, prefixed with `https://`)
    3. Fallback to `http://localhost:3000` for local development
  - Set `NEXT_PUBLIC_SITE_URL` in Vercel Project Settings → Environment Variables for Production (and Preview if desired)

### API Routes

- **POST /api/cloudflare-stream/init**: Initialize Cloudflare Stream upload
  - Accepts JSON with file metadata (fileName, fileSize, fileType)
  - Validates file type (video/*) and size (max 1.5 GB)
  - For files <=200MB: Creates Direct Creator Upload URL (simple POST upload)
  - For files >200MB: Creates TUS resumable upload session
  - Returns upload URL and upload type (direct/tus) to client
  - Fast endpoint (~1-2 seconds) - only initializes upload
  - Requires authentication
  - Uses CLOUDFLARE_STREAM_API_TOKEN and CLOUDFLARE_ACCOUNT_ID from environment
  - Configured with maxDuration of 60 seconds
  - Client uploads file directly to Cloudflare Stream (bypasses server timeout limits)

- **POST /api/speeches/submit**: Submit a new speech with Cloudflare Stream URL/UID or audio file
  - Accepts either JSON (Cloudflare Stream URL or video UID) or multipart/form-data (audio file upload)
  - For Cloudflare Stream: Validates URL format (accepts cloudflarestream.com URLs, videodelivery.net URLs, or video UIDs)
  - For audio: Validates file type and size (max 50 MB), uploads to Supabase Storage
  - Checks for duplicate URLs per user
  - Calculates week start date (Monday)
  - Requires authentication

- **GET /api/speeches**: Fetch all speeches for ballot selection
  - Returns speeches ordered by user and submission date
  - Generates titles in format "User Name - Oct 30 -1", "User Name - Oct 30 -2", etc.
  - Includes flag indicating if speaker has previous speeches (for "better than last" logic)
  - Requires authentication

- **POST /api/ballots/submit**: Submit a ballot (review) for a speech
  - Accepts JSON with speech_id, rating criteria (gestures, delivery, pauses, content, entertaining), feedback text, and better_than_last flag
  - Validates all ratings are 1-10
  - Prevents users from reviewing their own speeches
  - Prevents duplicate reviews (one ballot per reviewer per speech)
  - Validates "better than last" checkbox only if speaker has previous speeches
  - Requires authentication

- **GET /api/leaderboard**: Fetch leaderboard data
  - Returns all users with weekly and all-time speech counts
  - Includes speech details with associated ballots
  - Ballots include reviewer names and all rating criteria
  - Sorted by all-time speeches (descending)
  - Includes user profiles with avatars and speech URLs

- **POST /api/feature-requests/submit**: Submit a feature request
  - Accepts JSON with title and description
  - Validates title (required, max 200 characters) and description (required, max 5000 characters)
  - Inserts into `feature_requests` table
  - Requires authentication
  - Note: Client fetches should use `{ cache: 'no-store' }` to always show fresh submissions

 - **GET /api/feature-requests**: Fetch feature requests
  - Returns list of feature requests with submitter name/email
  - Requires authentication
  - Configured as dynamic with no revalidation (`dynamic = 'force-dynamic'`, `revalidate = 0`)
  - Intended to be fetched with `{ cache: 'no-store' }` on the client to avoid stale data

- **GET /api/users/email-preferences**: Fetch user's email notification preferences
  - Returns `email_reminders_enabled` boolean flag
  - Defaults to true if user has no preference set
  - Requires authentication

- **PATCH /api/users/email-preferences**: Update user's email notification preferences
  - Accepts JSON with `enabled` boolean
  - Updates `email_reminders_enabled` field in users table
  - Requires authentication

- **POST /api/emails/daily-reminder**: Trigger daily reminder emails
  - Sends reminder emails to users who:
    1. Have `email_reminders_enabled = true`
    2. Haven't submitted a speech today
  - Called by Supabase pg_cron job (scheduled external invocation)
  - Requires `CRON_SECRET` header matching environment variable for authorization
  - Uses Supabase service role for database access (no user session required)
  - Sends emails via Resend service
  - Updates `last_reminder_sent_at` timestamp for tracking
  - Returns results array with success/failure status for each email sent

### Current State

The application features:
- **LeaderBoard Component** ([app/components/LeaderBoard.tsx](app/components/LeaderBoard.tsx)):
  - Fetches real leaderboard data from API
  - Real-time updates via Supabase subscriptions (speeches and ballots)
  - Displays weekly and all-time speech counts
  - Podium visualization for top 3 speakers
  - Responsive table layout for all entries
  - Links to speech recordings (Cloudflare Stream videos or audio files)
  - Displays ballots column with expandable ballot details
  - Shows reviewer names and rating criteria (gestures, delivery, pauses, content, entertaining)
  - Displays "better than last" indicator and feedback text
  - Top buttons for "New Speech", "Make a Ballot", "Feature Request", and authentication
  
- **AuthButton Component** ([app/components/AuthButton.tsx](app/components/AuthButton.tsx)):
  - Google OAuth login/logout
  - Shows user state
  
- **SpeechSubmitModal Component** ([app/components/SpeechSubmitModal.tsx](app/components/SpeechSubmitModal.tsx)):
  - Tabbed interface for choosing between video upload, Stream link, or audio upload
  - Upload Video tab: File input for video files (max 1.5 GB), uses client-side direct upload to Cloudflare Stream
    - Calls `/api/cloudflare-stream/init` to get upload URL (fast, ~1-2 seconds)
    - For files <=200MB: Direct POST upload to Cloudflare Stream upload URL
    - For files >200MB: TUS resumable upload using `tus-js-client` library
      - 5MB chunks with automatic retry (0ms, 3s, 5s, 10s, 20s delays)
      - Built-in session persistence (auto-resume if browser closes)
      - Handles network interruptions gracefully with exponential backoff
      - No manual timeout management needed
    - Real-time progress tracking (10-90% for upload, 95% for speech submission)
    - No server timeout limits (upload happens client → Cloudflare Stream directly)
    - Extracts video UID from upload URL
  - Stream Link tab: Text input for pasting existing Cloudflare Stream URLs or video UIDs, validates format, submits directly to speeches API
  - Upload Audio tab: File input for audio files (max 50 MB), uploads to Supabase Storage, shows progress indicator
  - Client-side and server-side validation
  - Duplicate detection

- **BallotSubmitModal Component** ([app/components/BallotSubmitModal.tsx](app/components/BallotSubmitModal.tsx)):
  - Speech selection dropdown with speeches grouped by user
  - Speech titles display as "User Name - Oct 30 -1" format
  - Five rating sliders (1-10) for: gestures, delivery, pauses, content, entertaining
  - Optional text area for feedback
  - Conditional "better than last" checkbox (only shown if speaker has previous recordings)
  - Form validation and submission
  - Prevents reviewing own speeches

- **FeatureRequestModal Component** ([app/components/FeatureRequestModal.tsx](app/components/FeatureRequestModal.tsx)):
  - Title input field (required, max 200 characters) with character counter
  - Description textarea (required, max 5000 characters) with character counter
  - Form validation (client and server-side)
  - Loading states and error handling
  - Cancel and Submit buttons matching ballot modal styling
  - Requires authentication before submission

- **BallotViewModal Component** ([app/components/BallotViewModal.tsx](app/components/BallotViewModal.tsx)):
  - Displays ballots received on a speech
  - Dropdown to select between multiple ballots (indexed by reviewer name and date)
  - Read-only display of all rating criteria (gestures, delivery, pauses, content, entertaining) as progress bars
  - Shows reviewer name and submission timestamp
  - Displays "Better than last" indicator if applicable
  - Shows optional feedback text in a read-only box
  - Close button to dismiss modal

## Code Organization

### Directory Structure

- **app/components/**: React client components (LeaderBoard, AuthButton, SpeechSubmitModal, BallotSubmitModal, BallotViewModal, FeatureRequestModal)
- **app/api/**: API route handlers for backend operations
  - `cloudflare-stream/init/`: Cloudflare Stream upload initialization
  - `speeches/`: Fetch speeches for ballot selection
  - `speeches/submit/`: Speech submission endpoint
  - `ballots/submit/`: Ballot submission endpoint
  - `feature-requests/`: Fetch feature requests
  - `feature-requests/submit/`: Feature request submission endpoint
  - `leaderboard/`: Leaderboard data endpoint
  - `users/email-preferences/`: Get/update email notification preferences
  - `emails/daily-reminder/`: Trigger daily reminder emails (called by cron job)
- **app/auth/callback/**: OAuth callback handler for Supabase
- **lib/supabase/**: Supabase client utilities
  - `client.ts`: Browser client for client components
  - `server.ts`: Server client for server components and API routes
  - `middleware.ts`: Middleware client for session refresh
- **lib/resend.ts**: Email template functions for transactional and reminder emails

The codebase follows Next.js conventions:
- Server Components by default (add `'use client'` directive for client components)
- TypeScript interfaces for type safety
- Responsive design with Tailwind CSS utility classes
- API routes use Next.js 15+ App Router patterns

## ESLint Configuration

ESLint is configured with Next.js recommended settings ([eslint.config.mjs](eslint.config.mjs)):
- Uses `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Ignores `.next/`, `out/`, `build/`, and `next-env.d.ts`
