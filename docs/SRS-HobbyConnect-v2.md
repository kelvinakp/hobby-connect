# Software Requirements Specification (SRS)
## HobbyConnect - University Hobby and Skill Community Platform

Version: 2.0  
Date: 2026-04-21  
Prepared for: Software Engineering Project

## 1. Introduction

### 1.1 Purpose
This SRS defines the current functional and non-functional requirements for HobbyConnect based on the implemented system. It is the baseline reference for development, QA, and project documentation.

### 1.2 Scope
HobbyConnect is a web platform for university students to connect through hobbies and communities. The current system provides:
- authentication and onboarding flow,
- profile and role management,
- community interaction through chat and events,
- global announcement publishing with admin review workflow,
- admin moderation operations across users and content.

## 2. Overall Description

### 2.1 Product Perspective
The system is built as a web application using Next.js and Supabase (Auth + Postgres + RLS). It uses role-based behavior (`user`, `moderator` as community leader, `admin`) and server-side session enforcement through middleware.

### 2.2 User Classes and Characteristics
- **Student (User)**: registers, completes onboarding, joins communities, chats, and participates in events.
- **Community Leader (Moderator)**: can submit announcement posts for admin review and manage community-level activities.
- **Administrator (Admin)**: can moderate users/content globally, review posts, and manage publication state.

### 2.3 Assumptions and Dependencies
- Users authenticate with university email accounts.
- External SMTP service is configured in Supabase Auth for confirmation/reset emails.
- Supabase services (database/auth) are available.
- Browsers support modern JavaScript and secure cookies.

## 3. Functional Requirements

### 3.1 Authentication and Account Lifecycle
- **FR-01 Registration**: The system shall allow new users to register.
- **FR-02 Login/Logout**: The system shall allow authenticated session management.
- **FR-03 Password Reset**: The system shall support forgot-password and reset-password flow through email links.
- **FR-04 Access Guarding**: Unauthenticated users shall be redirected to login for protected routes.

### 3.2 Onboarding and Profile Management
- **FR-05 Onboarding Enforcement**: Logged-in users who are not onboarded shall be redirected to onboarding.
- **FR-06 Profile Editing**: Users shall be able to update profile information.
- **FR-07 Password Change Security**: Users shall provide current password before setting a new password.

### 3.3 Roles and Authorization
- **FR-08 Role Definitions**: Roles shall include `user`, `moderator` (community leader), and `admin`.
- **FR-09 Admin Route Restriction**: Admin dashboard routes shall be accessible only to admins.
- **FR-10 Database Access Control**: Row-level security policies shall enforce role-based data access and actions.

### 3.4 Community and Interaction Features
- **FR-11 Community Discovery/Participation**: Users shall browse and join hobby communities.
- **FR-12 Community Messaging**: Authenticated users shall post messages in communities.
- **FR-13 Event Management**: Users with sufficient permission shall create/manage events according to role and policy.

### 3.5 Global Announcement Workflow (Uni Announcement)
- **FR-14 Announcement Feed**: The home feed shall display global published announcements.
- **FR-15 Post Authoring**: Admin and moderator users shall create posts with title, content, and optional image.
- **FR-16 Image Constraint**: Attached images shall be limited to a maximum of 500KB.
- **FR-17 Global Post Scope**: New announcement posts shall be global content (`community_id = null`).
- **FR-18 Anonymous Display**: Published announcements in feed shall not show author name, profile, or group.

### 3.6 Post Review and Moderation
- **FR-19 Auto-Publish by Admin**: Posts created by admins shall be saved as `PUBLISHED`.
- **FR-20 Moderator Review Flow**: Posts created by moderators shall be saved as `PENDING_REVIEW`.
- **FR-21 Admin Review Action**: Admin shall be able to approve (`PUBLISHED`) or reject (`REJECTED`) pending posts.
- **FR-22 Published Post Deletion**: Admin shall be able to delete published posts.

### 3.7 Admin Dashboard Operations
- **FR-23 User Oversight**: Admin shall view users and perform ban/unban.
- **FR-24 Content Oversight**: Admin shall remove inappropriate chat messages and events.
- **FR-25 Post Oversight**: Admin shall manage pending and published announcement queues.

## 4. Non-Functional Requirements

### 4.1 Security
- Session and role checks must be enforced on protected routes.
- Supabase RLS must be enabled for protected tables.
- Password operations must require valid authentication context.

### 4.2 Performance
- Feed and dashboard data fetching should avoid unnecessary full-page reloads.
- Heavy dashboard queries should be parallelized where possible.
- Middleware should avoid running on static and non-page routes.

### 4.3 Usability
- UI shall be responsive for desktop and mobile.
- Auth pages, feed, and forms should provide clear feedback and modern interaction design.

### 4.4 Reliability
- Core user operations (auth, profile, feed, moderation actions) should remain stable under normal concurrent use.

## 5. System Design and Architecture

### 5.1 Architecture Summary
- **Frontend**: Next.js App Router + React client components.
- **Backend**: Supabase Auth and Postgres.
- **Authorization**: Role-aware middleware + database RLS policies.
- **Realtime/Collaboration**: Supabase-backed messaging/events flows.

### 5.2 Data Model (Current Core Entities)
- `profiles`: user identity fields, role, ban status, onboarding status.
- `hobbies`: community definitions.
- `interests`: user-community relationship.
- `messages`: community chat content.
- `events`: community event records.
- `posts`: announcement content with status workflow and optional image metadata.

### 5.3 Post Lifecycle State Model
- `PENDING_REVIEW` -> `PUBLISHED` (admin approval)
- `PENDING_REVIEW` -> `REJECTED` (admin rejection)
- `PUBLISHED` -> deleted (admin deletion)

### 5.4 Route and Access Model
- Guest-only auth routes: login, register, forgot-password.
- Reset-password route is accessible in reset flow.
- Onboarding route behavior depends on `onboarding_complete`.
- Admin dashboard route requires admin role.

## 6. Validation and Test Scope
- Authentication flow tests (register/login/forgot/reset).
- Middleware redirect behavior tests.
- Profile update and password-change validation tests.
- Post creation/review/publication/deletion workflow tests.
- Admin moderation action tests (ban/unban, delete message/event/post).

## 7. Out of Scope (Current Version)
- Full recommendation engine with personalized scoring.
- Community analytics charts (growth/attendance dashboards).
- Comprehensive in-app notification center.
- Advanced post engagement (comments/upvotes) in announcement module.

