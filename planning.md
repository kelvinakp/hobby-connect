# Project: HobbyConnect

## System Overview
HobbyConnect is a University Hobby & Skill Community Management System. It replaces fragmented social media with a structured, role-based platform designed specifically for university students. 

## Tech Stack
- **Framework:** Next.js 14+ (App Router) with TypeScript.
- **Database & Auth:** Supabase (PostgreSQL).
- **Styling:** Tailwind CSS.

## UI/UX Vision (The "Anti-Social-Media" Approach)
- **Vibe:** Professional, organized, dashboard-centric enterprise system.
- **Palette:** Royal Purple (#6A0DAD), Clean White (#FFFFFF), and Deep Charcoal (#121212) for Dark Mode.
- **Navigation:** Persistent left sidebar for the Hobby Taxonomy (e.g., IT -> Python) instead of an algorithm-driven infinite scroll feed.
- **Component Style:** Glass-morphism cards in dark mode, clear data tables, and tabbed interfaces to prevent clutter.

## Core Modules & UI Flow
1. **Authentication:**
   - Login, Register, and Logout pages.
   - Registration requires: Student ID, First Name, Last Name, Password, Confirm Password, and a valid `@rsu.ac.th` university email.
2. **Community Group View (Tabbed Layout):**
   - **Chat Tab (Public to Group):** A real-time discussion board where any verified group member can read and post messages.
   - **Events Tab (Restricted Management):** A dashboard where members can view and RSVP to events. ONLY users with the `moderator` or `admin` role can see the "Create/Edit Event" buttons and manage the event lifecycle.
3. **Event Orchestrator:**
   - Scheduling and conflict detection for campus locations.
   - Event Status Lifecycle: DRAFT -> PENDING_APPROVAL -> APPROVED -> COMPLETED.