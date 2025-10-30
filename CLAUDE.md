# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an extemporaneous speeches leaderboard application built with Next.js 16, React 19, TypeScript, and Supabase. The app displays a competitive leaderboard showing speakers' rankings with both weekly and all-time speech counts. Users can log in with Google OAuth and submit their speech recordings via unlisted YouTube links or by uploading audio files directly.

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
- **Storage Buckets**:
  - `speech-audio`: Stores uploaded audio files (public read, authenticated write, 10 MB limit)
- **Authentication**: Google OAuth via Supabase Auth
- **Real-time**: Leaderboard updates live when speeches are submitted
- **RLS (Row Level Security)**: Enabled on all tables and storage buckets for security

Configuration:
- Supabase client utilities in [lib/supabase/](lib/supabase/)
- Environment variables in `.env.local` (not committed)
- Middleware for auth session refresh in [middleware.ts](middleware.ts)

### API Routes

- **POST /api/speeches/submit**: Submit a new speech with YouTube URL or audio file
  - Accepts either JSON (YouTube URL) or multipart/form-data (audio file upload)
  - For YouTube: Validates URL format
  - For audio: Validates file type and size (max 10 MB), uploads to Supabase Storage
  - Checks for duplicate URLs per user
  - Calculates week start date (Monday)
  - Requires authentication

- **GET /api/leaderboard**: Fetch leaderboard data
  - Returns all users with weekly and all-time speech counts
  - Sorted by all-time speeches (descending)
  - Includes user profiles with avatars and speech URLs

### Current State

The application features:
- **LeaderBoard Component** ([app/components/LeaderBoard.tsx](app/components/LeaderBoard.tsx)):
  - Fetches real leaderboard data from API
  - Real-time updates via Supabase subscriptions
  - Displays weekly and all-time speech counts
  - Podium visualization for top 3 speakers
  - Responsive table layout for all entries
  - Links to speech recordings (YouTube or audio files)
  
- **AuthButton Component** ([app/components/AuthButton.tsx](app/components/AuthButton.tsx)):
  - Google OAuth login/logout
  - Shows user state
  
- **SpeechSubmitModal Component** ([app/components/SpeechSubmitModal.tsx](app/components/SpeechSubmitModal.tsx)):
  - Tabbed interface for choosing between YouTube URL or audio upload
  - YouTube tab: URL input with validation
  - Audio upload tab: File input with drag-and-drop, progress indicator, size validation (max 10 MB)
  - Client-side and server-side validation
  - Duplicate detection

## Code Organization

### Directory Structure

- **app/components/**: React client components (LeaderBoard, AuthButton, SpeechSubmitModal)
- **app/api/**: API route handlers for backend operations
  - `speeches/submit/`: Speech submission endpoint
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
