# HobbyConnect - Developer Documentation

> **Last updated:** February 22, 2026
>
> This document captures every architectural decision, file purpose, database schema, known workaround, and remaining task so that any developer (or AI assistant in VS Code) can continue the project without prior context.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Getting Started](#3-getting-started)
4. [Project Structure](#4-project-structure)
5. [Architecture & Routing](#5-architecture--routing)
6. [Supabase Configuration](#6-supabase-configuration)
7. [Database Schema (SQL)](#7-database-schema-sql)
8. [Authentication Flow](#8-authentication-flow)
9. [Component Guide](#9-component-guide)
10. [Styling & Theming](#10-styling--theming)
11. [Known Issues & Workarounds](#11-known-issues--workarounds)
12. [Completed Features](#12-completed-features)
13. [Remaining / TODO Features](#13-remaining--todo-features)

---

## 1. Project Overview

**HobbyConnect** is a University Hobby & Skill Community Management System built for Rangsit University (`@rsu.ac.th`). It replaces fragmented social media groups with a structured, role-based platform where students can join hobby groups, participate in real-time group chats, and manage events.

**Design philosophy:** Professional, dashboard-centric "anti-social-media" approach — persistent sidebar navigation, tabbed interfaces, no algorithm-driven feed.

---

## 2. Tech Stack

| Layer          | Technology                                              |
| -------------- | ------------------------------------------------------- |
| Framework      | **Next.js 16.1.6** (App Router, Turbopack dev server)   |
| Language       | **TypeScript** (strict mode)                            |
| React          | **React 19.2.3**                                        |
| Auth & DB      | **Supabase** (`@supabase/supabase-js@^2.49.4`, `@supabase/ssr@^0.6.1`) |
| Styling        | **Tailwind CSS v4** with `@tailwindcss/postcss`         |
| Linting        | **ESLint 9** with `eslint-config-next@16.1.6`           |
| Package Mgr    | **npm** with overrides for `minimatch@^10.2.1` (security fix) |

---

## 3. Getting Started

### Prerequisites

- Node.js 18+ (recommended: 20+)
- npm 9+
- A Supabase project (credentials already configured)

### Installation

```bash
cd hobby-connect
npm install
```

### Environment Variables

The file `.env.local` at the project root contains:

```
NEXT_PUBLIC_SUPABASE_URL=https://ynwxleykhwjfbflutnlg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> **Important:** `.env*` is in `.gitignore`. If cloning fresh, recreate `.env.local` with your Supabase credentials. Both variables are prefixed `NEXT_PUBLIC_` so they are available on client and server.

### Running

```bash
npm run dev       # Starts Next.js dev server with Turbopack
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
```

---

## 4. Project Structure

```
hobby-connect/
├── .env.local                    # Supabase credentials (not in git)
├── package.json                  # Dependencies + minimatch override
├── tailwind.config.ts            # Custom brand/charcoal color palette + dark mode
├── tsconfig.json                 # Strict TS, path alias @/* -> ./src/*
├── next.config.ts                # Next.js config (currently empty)
├── postcss.config.mjs            # PostCSS with @tailwindcss/postcss
├── eslint.config.mjs             # ESLint flat config (Next.js core-web-vitals + TS)
├── planning.md                   # Original project planning document
│
└── src/
    ├── middleware.ts              # Next.js middleware entry point
    │
    ├── app/
    │   ├── layout.tsx            # Root layout (html, body, ThemeProvider, fonts)
    │   ├── globals.css           # Tailwind v4 imports + custom color theme tokens
    │   │
    │   ├── (auth)/               # Route group for authentication pages
    │   │   ├── layout.tsx        # Split-screen layout (branding left, form right)
    │   │   ├── login/
    │   │   │   └── page.tsx      # Login form with Supabase signInWithPassword
    │   │   └── register/
    │   │       └── page.tsx      # Registration form with Supabase signUp
    │   │
    │   ├── (main)/               # Route group for authenticated app pages
    │   │   ├── layout.tsx        # Sidebar + Header + main content wrapper
    │   │   ├── page.tsx          # Home/dashboard page with SupabaseTest component
    │   │   └── groups/
    │   │       └── [id]/
    │   │           └── page.tsx  # Dynamic group page (server component)
    │   │
    │   └── auth/
    │       └── callback/
    │           └── route.ts      # API route: Supabase email confirmation callback
    │
    ├── components/
    │   ├── ThemeProvider.tsx      # Dark/light theme context + toggle logic
    │   ├── Header.tsx            # Top header bar with theme toggle button
    │   ├── Sidebar.tsx           # Left sidebar with hobby taxonomy navigation
    │   ├── SupabaseTest.tsx      # Quick Supabase connection test (queries 'hobbies')
    │   │
    │   └── groups/
    │       ├── GroupTabs.tsx      # Tabbed navigation: "Group Chat" | "Events"
    │       ├── GroupChat.tsx      # Real-time chat with Supabase subscriptions
    │       └── EventsTab.tsx     # Events placeholder ("coming soon")
    │
    ├── lib/
    │   └── supabase/
    │       ├── client.ts         # Browser-side Supabase client (createBrowserClient)
    │       ├── server.ts         # Server-side Supabase client (createServerClient + cookies)
    │       └── middleware.ts     # Middleware Supabase client (session refresh + route protection)
    │
    └── types/
        └── supabase.ts           # Full Database type definitions for all tables
```

---

## 5. Architecture & Routing

### Route Groups

Next.js App Router uses **route groups** (folders wrapped in parentheses) to share layouts without affecting the URL:

| Route Group | URL Examples       | Layout                         | Purpose                    |
| ----------- | ------------------ | ------------------------------ | -------------------------- |
| `(auth)`    | `/login`, `/register` | Split-screen branding + form | Unauthenticated pages      |
| `(main)`    | `/`, `/groups/[id]`   | Sidebar + Header + content   | Authenticated app pages    |

### Middleware (`src/middleware.ts`)

The middleware runs on every matched route and does two things:

1. **Refreshes the Supabase session** by exchanging cookies via `updateSession()`.
2. **Protects routes:**
   - If no user session exists and the route is NOT `/login`, `/register`, or `/auth/*` → redirect to `/login`.
   - If user IS logged in and visits `/login` or `/register` → redirect to `/`.

**Safety guard:** If Supabase credentials are missing or placeholder values (starts with `your_`), middleware skips all Supabase operations and lets the request through. This prevents crashes during local development without credentials.

### Server vs Client Components

| Pattern | Where Used | Why |
|---------|-----------|-----|
| **Server Component** (default) | `groups/[id]/page.tsx`, layouts | Fetches data on server, no JS shipped to client |
| **Client Component** (`"use client"`) | All interactive components (forms, chat, tabs, theme) | Needs browser APIs, state, effects, event handlers |

---

## 6. Supabase Configuration

### Three Client Utilities

The project uses `@supabase/ssr` (not raw `@supabase/supabase-js`) to properly handle cookies in Next.js:

#### 1. `src/lib/supabase/client.ts` — Browser Client

Used in client components (anything with `"use client"`).

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

#### 2. `src/lib/supabase/server.ts` — Server Client

Used in server components and API route handlers. Reads cookies via `next/headers`.

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: { getAll(), setAll(cookiesToSet) }
  });
}
```

#### 3. `src/lib/supabase/middleware.ts` — Middleware Client

Used in `src/middleware.ts`. Has special cookie handling that writes to both `request` and `response` objects.

### Important: No `<Database>` Generic

The Supabase clients are created **without** the `<Database>` type generic. This is intentional — `@supabase/postgrest-js@2.97.0` introduced a new type inference system that is incompatible with manually-crafted `Database` types (the old-style `{ [_ in never]: never }` for Views/Functions causes all query results to infer as `never`).

**Workaround:** We use explicit type assertions in components:

```typescript
// In server components
const { data } = await supabase.from("groups").select("*").eq("id", id).single();
const group = data as Tables<"groups"> | null;  // explicit cast

// In client components
setMessages((data as Message[]) ?? []);
```

The type definitions in `src/types/supabase.ts` still exist for use with these manual assertions and for future compatibility when Supabase CLI-generated types become compatible.

---

## 7. Database Schema (SQL)

The Supabase database has the following tables. Run this SQL in the **Supabase Dashboard > SQL Editor** if setting up from scratch.

### Custom Enums

```sql
CREATE TYPE public.event_status AS ENUM (
  'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'COMPLETED'
);

CREATE TYPE public.group_role AS ENUM (
  'member', 'moderator', 'admin'
);

CREATE TYPE public.skill_level AS ENUM (
  'beginner', 'intermediate', 'advanced'
);
```

### Tables

```sql
-- Profiles (linked to Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Groups (hobby groups, supports parent/child hierarchy)
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.groups(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Group Members (composite PK: group_id + user_id)
CREATE TABLE public.group_members (
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.group_role DEFAULT 'member',
  skill public.skill_level DEFAULT 'beginner',
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- Messages (real-time group chat)
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Events (managed by moderators/admins)
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  capacity INTEGER NOT NULL,
  required_skill public.skill_level DEFAULT 'beginner',
  status public.event_status DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Hobbies (general hobby listing)
CREATE TABLE public.hobbies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hobbies ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only read/update/delete their own row
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Hobbies: anyone can read, authenticated can insert, owners can update/delete
CREATE POLICY "Anyone can read hobbies"
  ON public.hobbies FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert hobbies"
  ON public.hobbies FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own hobbies"
  ON public.hobbies FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own hobbies"
  ON public.hobbies FOR DELETE USING (auth.uid() = created_by);
```

> **Note:** RLS policies for `groups`, `group_members`, `messages`, and `events` should be added based on your requirements. They are not yet implemented in the database.

### Supabase Real-time

Real-time is enabled for the `messages` table to power the group chat. Enable it in **Supabase Dashboard > Database > Replication** — make sure the `messages` table has replication turned on for `INSERT` events.

---

## 8. Authentication Flow

### Registration (`/register`)

1. User fills in: Student ID, First Name, Last Name, University Email, Password, Confirm Password.
2. **Client-side validation:**
   - Email must end with `@rsu.ac.th`
   - Password minimum 8 characters
   - Passwords must match
   - Student ID must be 7-10 digits
3. Calls `supabase.auth.signUp()` with email + password.
4. User metadata (student_id, first_name, last_name) is passed via `options.data`.
5. `emailRedirectTo` points to `/auth/callback`.
6. On success, shows "Check your email" confirmation screen.

### Login (`/login`)

1. User enters email + password.
2. Validates email ends with `@rsu.ac.th`.
3. Calls `supabase.auth.signInWithPassword()`.
4. On success, redirects to `/` and refreshes the router.

### Email Confirmation Callback (`/auth/callback`)

- Supabase sends a confirmation email with a link containing a `code` parameter.
- The `GET` handler at `src/app/auth/callback/route.ts` exchanges this code for a session via `supabase.auth.exchangeCodeForSession(code)`.
- Redirects to `/` on success or `/login` on failure.

### Session Management (Middleware)

- Every request passes through `src/middleware.ts`.
- The middleware creates a Supabase server client, calls `supabase.auth.getUser()` to validate the session.
- Unauthenticated users are redirected to `/login`.
- Authenticated users visiting auth pages are redirected to `/`.

---

## 9. Component Guide

### `ThemeProvider` (`src/components/ThemeProvider.tsx`)

- Provides `ThemeContext` with `{ theme, toggleTheme }`.
- Reads initial theme from `localStorage` or `prefers-color-scheme` media query.
- Toggles the `dark` class on `<html>` element.
- **Critical fix applied:** Always renders `children` inside `ThemeContext.Provider` — uses `opacity-0` wrapper for the pre-mount state to prevent "useTheme must be used within ThemeProvider" errors.

### `Header` (`src/components/Header.tsx`)

- Fixed position, sits to the right of the sidebar (`left-64`).
- Contains the HobbyConnect logo and a dark/light mode toggle button.
- Uses `useTheme()` hook from ThemeProvider.

### `Sidebar` (`src/components/Sidebar.tsx`)

- Fixed left sidebar, 256px wide (`w-64`), full height.
- Displays a hardcoded list of hobby taxonomy categories:
  - IT & Programming, Music & Arts, Sports & Fitness, Science & Research, Languages & Culture
- **TODO:** Make these dynamic (fetch from database) and add navigation links.

### `SupabaseTest` (`src/components/SupabaseTest.tsx`)

- A diagnostic component displayed on the home page.
- Runs `supabase.from("hobbies").select("*")` on mount.
- Shows a colored status banner: green (success), red (error), gray (loading).
- **Can be removed** once you're confident the Supabase connection is stable.

### `GroupTabs` (`src/components/groups/GroupTabs.tsx`)

- Client component with two tabs: "Group Chat" and "Events".
- Active tab is highlighted with `bg-brand` (purple).
- Renders either `<GroupChat>` or `<EventsTab>` based on selection.

### `GroupChat` (`src/components/groups/GroupChat.tsx`)

- Fetches existing messages with profile joins: `messages.select("*, profiles(first_name)")`.
- Sets up a **Supabase real-time subscription** on channel `group-chat-{groupId}` listening for `INSERT` events on the `messages` table filtered by `group_id`.
- When a new message arrives via real-time, it fetches the sender's profile and appends the message to state.
- Messages are displayed as chat bubbles — own messages on the right (purple), others on the left (gray).
- Auto-scrolls to bottom on new messages.
- Text input + send button at the bottom. Shows "Sign in to send messages" if not authenticated.

### `EventsTab` (`src/components/groups/EventsTab.tsx`)

- Placeholder component showing "Events coming soon".
- Shows a badge if the user has `admin` or `moderator` role: "You can manage events as {role}".
- **TODO:** Build the full events CRUD interface.

### `groups/[id]/page.tsx` (Server Component)

- Fetches the group by ID from Supabase.
- Fetches the current user's membership role in that group.
- Returns 404 if the group doesn't exist.
- Renders group name, description, and passes data to `<GroupTabs>`.

---

## 10. Styling & Theming

### Color Palette

Defined in both `tailwind.config.ts` and `src/app/globals.css`:

| Token          | Hex       | Usage                             |
| -------------- | --------- | --------------------------------- |
| `brand`        | `#6A0DAD` | Primary purple (buttons, accents) |
| `brand-50`     | `#F3E8FF` | Light purple backgrounds          |
| `brand-600`    | `#5A0B92` | Hover states                      |
| `brand-900`    | `#2B0541` | Dark mode subtle backgrounds      |
| `charcoal`     | `#121212` | Dark mode background              |
| `charcoal-50`  | `#F5F5F5` | Light backgrounds                 |
| `charcoal-700` | `#303030` | Dark mode borders                 |
| `charcoal-800` | `#212121` | Dark mode card backgrounds        |

### Dark Mode

- Activated by adding `class="dark"` to the `<html>` element.
- Tailwind v4 custom variant: `@custom-variant dark (&:where(.dark, .dark *));`
- Usage: `dark:bg-charcoal dark:text-white dark:border-charcoal-700`

### Fonts

- **Geist Sans** — primary font (via `next/font/google`)
- **Geist Mono** — monospace font

### Layout Dimensions

- Sidebar: `w-64` (256px), fixed left
- Header: `h-16` (64px), fixed top, offset by sidebar (`left-64`)
- Main content: `ml-64 mt-16` with `p-6` padding

---

## 11. Known Issues & Workarounds

### 1. Supabase `<Database>` Generic Type Incompatibility

**Problem:** `@supabase/postgrest-js@2.97.0` changed its type inference system. Passing the manually-crafted `Database` type as a generic to `createBrowserClient<Database>()` or `createServerClient<Database>()` causes all query results to resolve to TypeScript `never` type.

**Root cause:** The library expects Views and Functions to be typed differently than the old `{ [_ in never]: never }` pattern. Even using `Record<string, never>` partially fixes it, but composite primary keys and union types in table rows still cause issues.

**Current workaround:**
- Supabase clients are created **without** the `<Database>` generic.
- Query results are explicitly cast using `as` assertions and manual interface definitions.
- The `src/types/supabase.ts` file is kept for reference and for use with the `Tables<>`, `InsertDto<>`, `UpdateDto<>` helper types.

**Future fix:** When the Supabase CLI (`supabase gen types typescript`) generates types compatible with the new postgrest-js, replace the manual types file with the auto-generated one and re-add the `<Database>` generic to all client calls.

### 2. ESLint 10 Incompatibility

**Problem:** Upgrading ESLint to v10 breaks `eslint-plugin-react` (used by `eslint-config-next`) with error: `contextOrFilename.getFilename is not a function`.

**Workaround:** Keep ESLint at `^9`. Do not upgrade until `eslint-config-next` ships compatible plugin versions.

### 3. `minimatch` ReDoS Vulnerability

**Problem:** `minimatch < 10.2.1` had a high-severity Regular Expression Denial of Service vulnerability (transitive dependency of ESLint).

**Fix applied:** `package.json` has an `overrides` section forcing `minimatch@^10.2.1`.

### 4. Middleware Crash with Missing Credentials

**Problem:** If `.env.local` has placeholder or missing Supabase credentials, the middleware crashes trying to call `supabase.auth.getUser()`.

**Fix applied:** Guard clause in `src/lib/supabase/middleware.ts` checks for placeholder values and skips Supabase operations. Entire Supabase block is wrapped in `try-catch`.

### 5. ThemeProvider Hydration Error

**Problem:** The original ThemeProvider returned `null` before mount, which meant `children` weren't wrapped in `ThemeContext.Provider`, causing "useTheme must be used within ThemeProvider" errors.

**Fix applied:** Always render children inside the Provider. Pre-mount state uses `<div className="opacity-0">{children}</div>` to hide flash of unstyled content while preserving context.

---

## 12. Completed Features

- [x] **Project scaffolding** — Next.js 16 + TypeScript + Tailwind CSS v4
- [x] **Custom color palette** — Brand purple + Deep charcoal with full shade scales
- [x] **Dark mode** — Class-based toggle with localStorage persistence
- [x] **Theme toggle** — Header button to switch light/dark mode
- [x] **Sidebar navigation** — Fixed left sidebar with hobby taxonomy categories (static)
- [x] **Authentication module:**
  - [x] Login page with email validation (`@rsu.ac.th`)
  - [x] Registration page with full validation (Student ID, names, email, password match)
  - [x] Supabase Auth integration (`signUp`, `signInWithPassword`)
  - [x] Email confirmation callback route
  - [x] Middleware-based route protection
  - [x] Auth layout with split-screen branding
- [x] **Supabase client setup:**
  - [x] Browser client (`@supabase/ssr`)
  - [x] Server client with cookie handling
  - [x] Middleware client with session refresh
- [x] **Database type definitions** — Full TypeScript types for all 6 tables + 3 enums
- [x] **Dynamic group page** (`/groups/[id]`):
  - [x] Server-side data fetching for group details and user role
  - [x] 404 handling for non-existent groups
- [x] **Tabbed navigation** — Group Chat | Events tabs with active state
- [x] **Real-time group chat:**
  - [x] Fetch existing messages with sender names
  - [x] Supabase real-time subscription for instant new messages
  - [x] Chat bubble UI (own messages right/purple, others left/gray)
  - [x] Auto-scroll on new messages
  - [x] Send message input with loading state
  - [x] "Sign in to send messages" for unauthenticated users
- [x] **Events tab placeholder** — "Coming soon" with role-based badge
- [x] **Supabase connection test component** — Queries `hobbies` table on home page
- [x] **Dependency security fixes** — `minimatch` override, vulnerability resolution
- [x] **SQL migration script** — `hobbies` + `profiles` tables with RLS policies

---

## 13. Remaining / TODO Features

Based on `planning.md` and the current state:

### High Priority

- [ ] **Events CRUD** — Build the full events management interface in the Events tab:
  - Create/edit event form (only for `moderator`/`admin` roles)
  - Event listing with RSVP functionality
  - Event status lifecycle: DRAFT → PENDING_APPROVAL → APPROVED → COMPLETED
  - Scheduling and conflict detection for campus locations
- [ ] **RLS Policies** — Add Row Level Security policies for `groups`, `group_members`, `messages`, and `events` tables (only `profiles` and `hobbies` have policies currently)
- [ ] **Profile page** — User profile view/edit page using the `profiles` table
- [ ] **Dynamic sidebar** — Fetch hobby groups from database instead of static list; add navigation links to `/groups/[id]`

### Medium Priority

- [ ] **Group management** — Create/join/leave groups
- [ ] **Search functionality** — Search for groups, hobbies, or users
- [ ] **User roles management** — Admin panel for promoting/demoting group members
- [ ] **Profile creation on signup** — Auto-create a `profiles` row when a user signs up (use Supabase trigger or handle in the callback)
- [ ] **Forgot password flow** — Currently the "Forgot password?" link points back to `/login`

### Low Priority

- [ ] **Responsive mobile layout** — Sidebar is hidden on mobile; needs a hamburger menu
- [ ] **Notifications** — Real-time notifications for messages, events, etc.
- [ ] **File/image uploads** — Profile avatars, group images (use Supabase Storage)
- [ ] **Supabase CLI type generation** — Replace manual `types/supabase.ts` with auto-generated types once `@supabase/postgrest-js` compatibility is resolved

---

## Appendix: Key Commands

```bash
# Development
npm run dev                    # Start dev server (Turbopack) at localhost:3000

# Build
npm run build                  # Production build
npm run start                  # Serve production build

# Linting
npm run lint                   # Run ESLint

# Supabase CLI (if installed globally)
npx supabase gen types typescript --project-id ynwxleykhwjfbflutnlg > src/types/supabase.ts
```

## Appendix: File Quick Reference

| File | Type | Purpose |
|------|------|---------|
| `src/middleware.ts` | Server | Route protection + session refresh |
| `src/lib/supabase/client.ts` | Client util | Browser Supabase client factory |
| `src/lib/supabase/server.ts` | Server util | Server Supabase client factory |
| `src/lib/supabase/middleware.ts` | Server util | Middleware Supabase client + auth logic |
| `src/types/supabase.ts` | Types | Database schema types (6 tables, 3 enums) |
| `src/components/ThemeProvider.tsx` | Client | Theme context + dark mode toggle |
| `src/components/Header.tsx` | Client | Top navigation bar |
| `src/components/Sidebar.tsx` | Client | Left sidebar navigation |
| `src/components/SupabaseTest.tsx` | Client | Connection test (removable) |
| `src/components/groups/GroupTabs.tsx` | Client | Tab navigation for group page |
| `src/components/groups/GroupChat.tsx` | Client | Real-time chat with Supabase |
| `src/components/groups/EventsTab.tsx` | Client | Events placeholder |
| `src/app/(auth)/layout.tsx` | Server | Auth pages split-screen layout |
| `src/app/(auth)/login/page.tsx` | Client | Login form |
| `src/app/(auth)/register/page.tsx` | Client | Registration form |
| `src/app/(main)/layout.tsx` | Server | Main app layout (sidebar + header) |
| `src/app/(main)/page.tsx` | Server | Home/dashboard page |
| `src/app/(main)/groups/[id]/page.tsx` | Server | Dynamic group page |
| `src/app/auth/callback/route.ts` | Server | Email confirmation handler |
