# LovKey

A dating app that matches on personality and vibe first — chat unlocks before photos. Built with React, Vite, TypeScript, Tailwind, shadcn/ui, and Supabase (auth, Postgres, storage, edge functions).

## Stack

- **Frontend**: Vite + React 18 + TypeScript, React Router, TanStack Query
- **UI**: Tailwind CSS + shadcn/ui (Radix primitives)
- **Backend**: Supabase — Postgres (with RLS), Auth, Storage, scheduled Postgres functions (`pg_cron`) for daily matching/onboarding resets, and two edge functions (`generate-cultural-vibes`, `get-signed-photo-url`)

## Local setup

Requires Node.js & npm.

```sh
# 1. Install dependencies
npm i

# 2. Copy the env template and fill in your Supabase project's values
cp .env.example .env

# 3. Start the dev server
npm run dev
```

`.env` holds your Supabase project URL, project ID, and publishable (anon) key — get these from your Supabase project's API settings. `.env` is gitignored; never commit it.

## Project layout

```
src/
  pages/            Route-level pages (Index, MatchProfileView, ChatProfileView, NotFound)
  components/        Screen-level components (AuthScreen, OnboardingScreen, MatchesScreen, ChatScreen, ...)
    profile/         Profile screen subcomponents
    profile-setup/    Profile setup flow subcomponents
    ui/              shadcn/ui primitives in use
  hooks/             Data-fetching and feature hooks (useMatches, useChats, useMessages, ...)
  integrations/supabase/  Supabase client and generated DB types
  lib/               Shared utilities

supabase/
  functions/         Edge functions (generate-cultural-vibes, get-signed-photo-url)
  migrations/        SQL migration history for the Supabase project
```

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run lint` — run ESLint
- `npm run preview` — preview a production build locally
