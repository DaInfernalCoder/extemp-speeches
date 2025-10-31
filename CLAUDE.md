# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an extemporaneous speeches leaderboard application built with Next.js 16, React 19, TypeScript, and Supabase. The app displays a competitive leaderboard showing speakers' rankings with both weekly and all-time speech counts. Users can log in with Google OAuth and submit their speech recordings by uploading videos directly to YouTube (as unlisted) or by uploading audio files to Supabase storage.

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

### TypeScript Configuration

- **Path alias**: `@/*` maps to the root directory (e.g., `@/app/components/Foo`)
- **Strict mode enabled**: All code must pass strict TypeScript checks
- **Target**: ES2017
- **JSX**: Uses react-jsx transform

### Supabase Backend

The application uses **Supabase** for authentication, data storage, and file storage:
- **Database Tables**:
  - `users`: Stores user profiles (synced with auth.users)
  - `speeches`: Stores speech submissions with speech URLs and week tracking
  - `ballots`: Stores speech reviews with multiple criteria ratings (1-10 scale), feedback text, and comparison flags
  - `feature_requests`: Stores user-submitted feature requests with title and description
- **Storage Buckets**:
  - `speech-audio`: Stores uploaded audio files (public read, authenticated write, 50 MB limit)
- **Authentication**: Google OAuth via Supabase Auth with YouTube Data API v3 scope (`https://www.googleapis.com/auth/youtube.upload`) configured in AuthButton component for video uploads
- **Real-time**: Leaderboard and ballots update live when speeches or ballots are submitted
- **RLS (Row Level Security)**: Enabled on all tables and storage buckets for security

Configuration:
- Supabase client utilities in [lib/supabase/](lib/supabase/)
- Environment variables in `.env.local` (not committed)
- Middleware for auth session refresh in [middleware.ts](middleware.ts)

### API Routes

- **POST /api/youtube/upload**: Upload video to YouTube
  - Accepts multipart/form-data with video file
  - Validates file type (video/*) and size (max 1.5 GB)
  - Uses YouTube Data API v3 Resumable Upload protocol to upload large videos in chunks (5MB chunks)
  - Initializes upload session with metadata, then streams video in chunks to YouTube
  - Handles token refresh automatically if OAuth token expires during upload
  - Uploads video as unlisted on YouTube
  - Returns YouTube video URL
  - Requires authentication and YouTube upload permission
  - Uses OAuth access token from Supabase session
  - Configured with maxDuration of 300 seconds (5 minutes) for large uploads

- **POST /api/speeches/submit**: Submit a new speech with YouTube URL or audio file
  - Accepts either JSON (YouTube URL) or multipart/form-data (audio file upload)
  - For YouTube: Validates URL format
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

### Current State

The application features:
- **LeaderBoard Component** ([app/components/LeaderBoard.tsx](app/components/LeaderBoard.tsx)):
  - Fetches real leaderboard data from API
  - Real-time updates via Supabase subscriptions (speeches and ballots)
  - Displays weekly and all-time speech counts
  - Podium visualization for top 3 speakers
  - Responsive table layout for all entries
  - Links to speech recordings (YouTube or audio files)
  - Displays ballots column with expandable ballot details
  - Shows reviewer names and rating criteria (gestures, delivery, pauses, content, entertaining)
  - Displays "better than last" indicator and feedback text
  - Top buttons for "New Speech", "Make a Ballot", "Feature Request", and authentication
  
- **AuthButton Component** ([app/components/AuthButton.tsx](app/components/AuthButton.tsx)):
  - Google OAuth login/logout
  - Shows user state
  
- **SpeechSubmitModal Component** ([app/components/SpeechSubmitModal.tsx](app/components/SpeechSubmitModal.tsx)):
  - Tabbed interface for choosing between video upload, YouTube link, or audio upload
  - Upload Video tab: File input for video files (max 1.5 GB), uploads directly to YouTube as unlisted, shows progress indicator
  - YouTube Link tab: Text input for pasting existing YouTube URLs, validates URL format, submits directly to speeches API
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

## Code Organization

### Directory Structure

- **app/components/**: React client components (LeaderBoard, AuthButton, SpeechSubmitModal, BallotSubmitModal, FeatureRequestModal)
- **app/api/**: API route handlers for backend operations
  - `youtube/upload/`: YouTube video upload endpoint (uses YouTube Data API v3)
  - `speeches/`: Fetch speeches for ballot selection
  - `speeches/submit/`: Speech submission endpoint
  - `ballots/submit/`: Ballot submission endpoint
  - `feature-requests/submit/`: Feature request submission endpoint
  - `leaderboard/`: Leaderboard data endpoint
- **app/auth/callback/**: OAuth callback handler for Supabase
- **lib/supabase/**: Supabase client utilities
  - `client.ts`: Browser client for client components
  - `server.ts`: Server client for server components and API routes
  - `middleware.ts`: Middleware client for session refresh

The codebase follows Next.js conventions:
- Server Components by default (add `'use client'` directive for client components)
- TypeScript interfaces for type safety
- Responsive design with Tailwind CSS utility classes
- API routes use Next.js 15+ App Router patterns

## ESLint Configuration

ESLint is configured with Next.js recommended settings ([eslint.config.mjs](eslint.config.mjs)):
- Uses `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Ignores `.next/`, `out/`, `build/`, and `next-env.d.ts`
