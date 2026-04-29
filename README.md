# HobbyConnect

University Hobby & Skill Community Management System built with Next.js and Supabase.

HobbyConnect helps students discover communities, join hobby groups, chat in real time, organize events, and publish university announcements with an admin review workflow.

## Features

- University email authentication (`@rsu.ac.th`) with register, login, and password reset
- Onboarding flow to collect interests and skill levels
- Profile management (bio, major, avatar, skills, hobby tags, password change)
- Community creation and membership (join/leave)
- Real-time community chat
- Community events creation and management
- Global Uni Announcement feed with optional post images
- Role-based access:
  - **User** (student)
  - **Community Leader** (community creator / moderator behavior)
  - **Admin** (platform-wide moderation and dashboard)
- Admin dashboard for:
  - ban/unban users
  - approve/reject pending posts
  - delete published posts, messages, and events
- Dark/light theme support

## Tech Stack

- **Frontend:** Next.js (App Router), React, TypeScript
- **Styling:** Tailwind CSS v4
- **Backend Services:** Supabase (Auth, Postgres, Realtime, Storage)
- **Linting:** ESLint

## Project Structure

```text
src/
  app/
    (auth)/          # Login, register, forgot/reset password
    (main)/          # Main app shell and protected pages
    (onboarding)/    # First-time onboarding flow
  components/        # Reusable UI and feature components
  lib/               # Utilities and Supabase clients
  types/             # Type definitions (including Supabase types)
supabase/
  migrations/        # SQL migrations
docs/
  User-Manual-HobbyConnect.md
```

## Prerequisites

- Node.js 20+
- npm
- Supabase project (URL + anon key)

## Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

If these are missing or placeholder values, the app shows a configuration-required screen.

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Add environment variables in `.env.local` (see above).

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run dev` - Start local development server (Turbopack)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Roles and Workflow Summary

- **Students** register with university email, complete onboarding, join communities, chat, and attend events.
- **Community leaders** (community creators) can submit announcement posts for admin review.
- **Admins** can switch to Admin Mode, access all communities, moderate users/content, and publish announcements directly.

## Media and Favicon

Favicon assets are stored in:

- `public/favicon/favicon-16x16.png`
- `public/favicon/favicon-32x32.png`
- `public/favicon/apple-touch-icon.png`

Icons are configured in `src/app/layout.tsx`.

## Documentation

- User Manual: `docs/User-Manual-HobbyConnect.md`
- Additional technical notes: `DOCUMENTATION.md`

## License

This project is currently private and maintained for academic/project use.

