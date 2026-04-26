# NEXUS - Skill Exchange Platform
## Comprehensive Technical Documentation

**Version:** 1.0.0  
**Last Updated:** April 2026  
**Institution:** University of Botswana  
**Project Type:** BSc Computer Science Final Year Project  

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Database Schema](#database-schema)
6. [Backend API Documentation](#backend-api-documentation)
7. [Frontend Application](#frontend-application)
8. [Core Features](#core-features)
9. [Security Implementation](#security-implementation)
10. [Matching Algorithm](#matching-algorithm)
11. [Deployment](#deployment)
12. [Development Guide](#development-guide)

---

## Overview

NEXUS is an intelligent, non-monetary skill-exchange platform designed specifically for University of Botswana students. The system enables peer-to-peer learning through a time-banking credit system where students teach skills they possess to earn credits, which they can spend to learn skills from others. It also supports credit-free multi-party exchange cycles where groups of 3–5 students teach each other in a round-robin fashion.

### Key Objectives

- **Democratize Learning:** Enable students to learn from each other regardless of financial constraints
- **Skill Monetization:** Allow students to earn credits by teaching skills they possess
- **Community Building:** Foster a collaborative learning environment at UB
- **Trust & Safety:** Implement robust verification, rating, and moderation systems

### Target Audience

- **Primary:** University of Botswana students (undergraduate and postgraduate)
- **Secondary:** Faculty and staff (future expansion)
- **Admins:** Platform administrators for moderation and oversight

---

## Architecture

### System Architecture

NEXUS follows a **client-server architecture** with clear separation of concerns:

```
Frontend (React + TypeScript)
    ↓ HTTPS/REST API
Backend (Node.js + Express.js)
    ↓ PostgreSQL
Database (PostgreSQL 14+)
```

### Design Patterns

- **MVC Pattern:** Backend follows Model-View-Controller structure
- **Context API:** Frontend uses React Context for state management
- **Repository Pattern:** Database access abstracted through service layer
- **Middleware Pattern:** Express middleware for authentication and validation
- **Observer Pattern:** Triggers and functions for database events

### Data Flow

```
User Action → Frontend Component → AuthContext → API Call
    ↓
Backend Route → Middleware → Service Layer → Database Query
    ↓
Database Response → Service → Route → Frontend Context → UI Update
```

---

## Technology Stack

### Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.0 | UI Framework |
| TypeScript | 5.9.3 | Type Safety |
| Vite | 8.0.0-beta.13 | Build Tool |
| React Router | 7.13.0 | Client-side Routing |
| TailwindCSS | 3.4.19 | Styling |
| Axios | 1.13.5 | HTTP Client |
| Lucide React | 0.564.0 | Icons |
| Material UI | 7.3.9 | UI Components |
| Headless UI | 2.2.9 | Accessible Components |
| Emotion | 11.14.0 | CSS-in-JS |

### Backend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime Environment |
| Express.js | 5.2.1 | Web Framework |
| PostgreSQL (pg) | 8.18.0 | Database Client |
| JWT | 9.0.3 | Authentication |
| bcryptjs | 3.0.3 | Password Hashing |
| Helmet | 8.1.0 | Security Headers |
| CORS | 2.8.6 | Cross-Origin Resource Sharing |
| Morgan | 1.10.1 | HTTP Logging |
| Multer | 2.1.1 | File Uploads |
| node-cron | 4.2.1 | Scheduled Jobs |
| Stripe | 22.0.1 | Payment Processing |
| Resend | 6.10.0 | Email Service |
| Cloudinary | 2.6.0 | Cloud Storage |
| Nodemailer | 6.9.8 | Email Sending |
| Express Validator | 7.3.1 | Request Validation |
| Express Rate Limit | 8.2.1 | Rate Limiting |

### External Services

| Service | Purpose | Integration |
|---------|---------|------------|
| Resend.com | Email Delivery (OTP, notifications) | API Integration |
| Stripe | Credit Purchases | Webhook + API |
| Cloudinary | Profile Picture Storage | Direct Upload |
| Jitsi Meet | Video Conferencing | Embedded Links |
| Railway | Cloud Deployment (Backend) | Platform-as-a-Service |
| Vercel | Cloud Deployment (Frontend) | Platform-as-a-Service |

---

## Project Structure

### Root Directory Structure

```
Final Year Project/
├── backend/                  # Node.js Express API
│   ├── config/              # Database and configuration
│   ├── jobs/                # Background scheduled jobs
│   ├── middleware/          # Express middleware
│   ├── models/              # Data models
│   ├── routes/              # API route handlers
│   ├── services/            # Business logic services
│   ├── utils/               # Utility functions
│   ├── uploads/             # Local file storage
│   ├── server.js            # Application entry point
│   └── package.json
│
├── frontend/                # React TypeScript Application
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── components/      # Reusable UI components (21)
│   │   ├── contexts/        # React contexts (Auth, Theme)
│   │   ├── pages/           # Page components (25)
│   │   ├── styles/          # Global styles
│   │   ├── utils/           # Utility functions
│   │   ├── App.tsx          # Main app component
│   │   └── main.tsx         # Entry point
│   └── package.json
│
├── database/                # Database schema and migrations
│   ├── schema.sql           # Complete database schema
│   ├── seed.sql             # Initial data seeding
│   └── migration files
│
└── README.md
```

### Backend Structure Details

**Config Directory:**
- `database.js` - PostgreSQL connection pool configuration
- `migrations.js` - Database migration runner
- `stripe.js` - Stripe payment configuration

**Jobs Directory:**
- `matchingJobs.js` - Scheduled jobs for async match generation and cycle detection

**Middleware Directory:**
- `auth.js` - JWT authentication middleware
- `adminAuth.js` - Admin-specific authentication
- `upload.js` - File upload validation and handling

**Models Directory (8 models):**
- `User.js` - User data model and operations
- `Admin.js` - Admin account model
- `Exchange.js` - Exchange request model
- `ExchangeSession.js` - Session management model
- `OTP.js` - OTP code model
- `CreditPurchase.js` - Stripe purchase model
- `Report.js` - User report model
- `PasswordReset.js` - Password reset model

**Routes Directory (13 routes):**
- `auth.js` - Authentication endpoints
- `skills.js` - Skill CRUD operations
- `exchanges.js` - Async exchange management
- `syncExchanges.js` - Sync exchange cycle management
- `matches.js` - Match generation and retrieval
- `matching.js` - Matching preferences
- `messages.js` - Messaging system
- `transactions.js` - Credit transactions
- `payments.js` - Stripe payment integration
- `reports.js` - User reporting
- `notifications.js` - Notification system
- `users.js` - User profile operations
- `admin.js` - Admin panel endpoints

**Services Directory:**
- `MatchingService.js` - Algorithm for skill matching and cycle detection
- `GraphService.js` - Graph-based cycle detection algorithms
- `emailService.js` - Email sending via Resend

### Frontend Structure Details

**Components Directory (21 components):**
- `Navbar.tsx` - Main navigation bar
- `ProtectedRoute.tsx` - Authentication guard
- `AdminProtectedRoute.tsx` - Admin authentication guard
- `Toast.tsx` - Notification toast component
- `ProfilePicture.tsx` - User avatar display
- `ProfilePictureUpload.tsx` - Profile picture upload
- `ProfileManager.tsx` - Profile management
- `EditProfileModal.tsx` - Profile editing modal
- `SkillDetailsModal.tsx` - Skill information modal
- `CreateSessionForm.tsx` - Session creation form
- `SessionCard.tsx` - Session display card
- `SessionRating.tsx` - Session rating component
- `VerificationCodeEntry.tsx` - OTP/code input
- `ExchangeConfirmModal.tsx` - Exchange confirmation
- `DeleteConfirmModal.tsx` - Delete confirmation
- `MessagingThread.tsx` - Chat message thread
- `JitsiMeetModal.tsx` - Video meeting modal
- `OTPVerification.tsx` - OTP verification flow
- `DarkModeToggle.tsx` - Theme toggle
- `ClearStorageButton.tsx` - Local storage cleanup
- `ColorSystemDemo.tsx` - Design system documentation

**Pages Directory (25 pages):**
- `Landing.tsx` - Landing page
- `About.tsx` - About page
- `Login.tsx` - User login
- `Register.tsx` - User registration
- `ForgotPassword.tsx` - Password recovery
- `ChangePassword.tsx` - Password change
- `Dashboard.tsx` - Main user dashboard
- `Browse.tsx` - Skill browsing
- `Profile.tsx` - User profile
- `UserProfile.tsx` - Public user profile
- `Messages.tsx` - Messaging center
- `TransactionHistory.tsx` - Credit transaction history
- `Requests.tsx` - Exchange requests
- `CreateSkill.tsx` - Skill creation
- `MySkills.tsx` - User's skills
- `EditSkill.tsx` - Skill editing
- `Matches.tsx` - Skill matches
- `ExchangeWorkspace.tsx` - Async exchange workspace
- `SyncExchangeWorkspace.tsx` - Sync exchange workspace
- `CreditStore.tsx` - Credit purchase
- `Admin.tsx` - Admin dashboard
- `AdminLogin.tsx` - Admin login
- `AdminReports.tsx` - Report management
- `AdminUserReports.tsx` - User-specific reports
- `AdminSessionMonitor.tsx` - Session monitoring

**Contexts Directory:**
- `AuthContext.tsx` - Authentication and user state management
- `ThemeContext.tsx` - Theme (dark/light) management

---

## Database Schema

### Overview

NEXUS uses PostgreSQL as its primary database. The schema is designed to support complex skill exchange workflows, credit transactions, multi-party cycles, and comprehensive moderation.

### Schema Statistics

- **Total Tables:** 17
- **Indexes:** 50+
- **Functions/Triggers:** 15+
- **Foreign Keys:** 20+

### Table Categories

#### 1. User & Authentication Tables

**users** - User accounts with comprehensive profile data, credit balance, ratings, and suspension status.

Key columns: id (UUID, PK), student_id (9-digit UB format), email (institutional), password_hash (bcrypt), time_credits, total_rating, skills_possessing (TEXT[]), skills_interested_in (TEXT[]), is_suspended, active_sync_exchange_id

**admins** - Administrator accounts with separate authentication and audit trail.

Key columns: id (UUID, PK), username, password_hash, created_by (FK to admins), last_login

**otps** - One-time password codes for email verification and password reset.

Key columns: email, otp_code (6-digit), purpose ('email_verification' or 'password_reset'), expires_at, is_used

#### 2. Skill Management Tables

**skill_categories** - Predefined skill categories for organization and pricing.

Seed data: Programming, Design, Mathematics, Languages, Business, Science, Engineering, Arts

**skills** - Skill listings (offers and requests) with detailed metadata.

Key columns: id (UUID, PK), user_id, title, description, category, skill_type ('offer'/'request'), difficulty_level, credits_required (auto-calculated), tags (TEXT[])

Credit Pricing: 3 credits for Programming/Mathematics/Science/Engineering, 2 credits for Design/Languages/Business/Arts

#### 3. Async Exchange Tables (One-to-One, Credit-Based)

**exchange_requests** - Exchange proposals with escrow tracking and status management.

Key columns: id (SERIAL, PK), skill_id, requester_id, instructor_id, status ('pending'/'accepted'/'declined'/'in_progress'/'completed'/'cancelled'/'terminated'/'disputed'), total_credits, escrow_credits, session_count

**exchange_sessions** - Scheduled sessions with verification codes and monitoring.

Key columns: id (SERIAL, PK), exchange_request_id, session_index, scheduled_at, duration_minutes, credit_share, verification_code (ABC-123-XYZ format), mentor_confirmed, learner_confirmed, meeting_link, mentor_joined_at, learner_joined_at, actual_duration_minutes

**exchange_reviews** - Post-exchange reviews (learner reviews instructor).

Key columns: id (SERIAL, PK), exchange_request_id, reviewer_id, reviewee_id, rating (1-5), comment

#### 4. Sync Exchange Tables (Multi-Party Cycles, Credit-Free)

**exchange_cycles** - Multi-party cycle metadata and status tracking.

Key columns: id (UUID, PK), cycle_length (2-5), cycle_score (0-100), status ('proposed'/'pending'/'active'/'completed'/'rejected'), cycle_data (JSONB), total_participants, accepted_count, rejected_count, exchange_mode ('sync'/'credit'), session_count, current_session_index, pair_session_counts (JSONB)

**cycle_participants** - Per-user cycle membership and acceptance tracking.

Key columns: id (UUID, PK), cycle_id, user_id, position_in_cycle, skill_offering, skill_receiving, status ('pending'/'accepted'/'rejected')

**sync_exchange_sessions** - Sessions for sync cycles with per-pair scheduling.

Key columns: id (UUID, PK), cycle_id, session_index, skill_pair_index, scheduled_at, verification_code, confirmations (JSONB), ratings (JSONB), join_timestamps (JSONB), meeting_ended

**cycle_reviews** - Post-cycle reviews merged with exchange reviews on profiles.

Key columns: id (SERIAL, PK), cycle_id, reviewer_id, reviewee_id, rating (1-5), comment

#### 5. Credit & Transaction Tables

**transactions** - Credit transaction ledger for all credit movements.

Key columns: id (SERIAL, PK), exchange_request_id, from_user_id, to_user_id, credits, transaction_type ('escrow'/'release'/'refund'/'purchase'/'welcome_bonus'/'admin_adjustment'), description

**credit_purchases** - Stripe payment records for credit purchases.

Key columns: id (SERIAL, PK), user_id, credits_purchased, amount_paid (BWP), stripe_payment_intent_id, stripe_session_id, status

Pricing: P20 per credit

#### 6. Communication Tables

**messages** - Conversation messages for exchange workspaces and sync cycles.

Key columns: id (UUID, PK), sender_id, receiver_id, exchange_request_id, cycle_id, content, is_read

**notifications** - User notification tracking.

Key columns: id (UUID, PK), user_id, title, message, notification_type, related_id, is_read

#### 7. Matching Tables

**skill_matches** - Algorithmically generated match suggestions.

Key columns: id (UUID, PK), learner_id, teacher_id, skill_name, match_score (0-100), status ('suggested'/'contacted'/'accepted'/'rejected'/'expired')

**matching_preferences** - User preferences for matching algorithm.

Key columns: id (UUID, PK), user_id, prefer_async, prefer_sync, min_match_score, max_cycle_length, auto_suggest, receive_cycle_notifications

#### 8. Moderation Tables

**reports** - User-generated reports for moderation.

Key columns: id (SERIAL, PK), reporter_id, reported_user_id, exchange_id, reason, description, status ('pending'/'under_review'/'resolved'/'dismissed'), admin_notes, reviewed_by

### Database Functions and Triggers

**Automatic Timestamp Updates:**
- `update_updated_at_column()` - Updates timestamp on modification (users, skills, matching_preferences, reports)
- `update_exchange_requests_updated_at()` - Exchange request timestamps
- `update_exchange_cycles_updated_at()` - Cycle timestamps
- `update_cycle_participants_updated_at()` - Participant timestamps
- `update_sync_sessions_updated_at()` - Sync session timestamps
- `update_skill_matches_updated_at()` - Match timestamps
- `update_matching_preferences_updated_at()` - Preference timestamps

**Cycle Management Triggers:**
- `update_cycle_acceptance_count()` - Tracks acceptances/rejections, auto-activates cycle when all accept
- `check_single_active_sync_exchange()` - Enforces one active sync exchange per user
- `update_user_active_sync_exchange()` - Sets/clears user's active exchange reference
- `update_sync_exchange_progress()` - Updates cycle progress, marks complete when all sessions done

**Rating System Triggers:**
- `update_user_rating_from_all_reviews()` - Calculates average rating from both exchange and cycle reviews

**Preference Initialization:**
- `create_default_matching_preferences()` - Creates default preferences for new users

---

## Backend API Documentation

### API Overview

- **Base URL:** `http://localhost:5000/api` (development)
- **Authentication:** JWT tokens via httpOnly cookies or Authorization header
- **Content-Type:** `application/json`
- **Rate Limiting:** 300 requests/15min (production), 1000 requests/15min (development)

### Authentication Endpoints

- `POST /api/auth/register` - Register new user (requires OTP verification)
- `POST /api/auth/verify-email` - Verify email with OTP code
- `POST /api/auth/resend-otp` - Resend OTP to email
- `POST /api/auth/login` - Authenticate and receive JWT token
- `POST /api/auth/forgot-password` - Initiate password reset via OTP
- `POST /api/auth/verify-reset-code` - Verify password reset OTP
- `POST /api/auth/reset-password` - Set new password with verified OTP
- `PUT /api/auth/change-password` - Change password while logged in
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/upload-profile-picture` - Upload to Cloudinary
- `POST /api/auth/upload-transcript` - Upload PDF transcript

### Skills Endpoints

- `GET /api/skills` - List all skills with filters (type, category, userId, search)
- `POST /api/skills` - Create skill (auto-priced by category)
- `PUT /api/skills/:id` - Update skill
- `DELETE /api/skills/:id` - Delete skill

### Async Exchange Endpoints

- `POST /api/exchanges/request` - Create request (credits to escrow)
- `GET /api/exchanges/requests` - Get incoming/outgoing requests
- `GET /api/exchanges/user/all` - Get all user exchanges
- `GET /api/exchanges/completed` - Get completed exchanges
- `PUT /api/exchanges/accept/:id` - Accept request
- `PUT /api/exchanges/decline/:id` - Decline request (refund)
- `GET /api/exchanges/:id` - Get exchange details

### Async Session Endpoints

- `POST /api/exchanges/:id/sessions` - Create session (instructor)
- `GET /api/exchanges/:id/sessions` - List sessions
- `POST /api/exchanges/sessions/:id/confirm` - Instructor confirms complete
- `POST /api/exchanges/sessions/:id/verify-code` - Learner verifies code
- `POST /api/exchanges/sessions/:id/join` - Record join time
- `POST /api/exchanges/sessions/:id/rate` - Rate session
- `DELETE /api/exchanges/sessions/:id` - Cancel session

### Async Review Endpoints

- `POST /api/exchanges/:id/review` - Submit exchange review (learner)
- `GET /api/exchanges/:id/review` - Check if reviewed

### Sync Exchange Endpoints

- `GET /api/sync-exchanges/active` - Check for active sync exchange
- `GET /api/sync-exchanges/cycles/my` - Get cycle proposals
- `POST /api/sync-exchanges/cycles/:id/respond` - Accept/reject proposal
- `POST /api/sync-exchanges/:id/set-session-count` - Set cycle session count
- `POST /api/sync-exchanges/:id/set-pair-session-count` - Set per-pair count
- `GET /api/sync-exchanges/:id/workspace` - Get workspace data
- `GET /api/sync-exchanges/history` - Get completed cycles

### Sync Session Endpoints

- `POST /api/sync-exchanges/:id/sessions` - Create sync session
- `POST /api/sync-exchanges/sessions/:id/end-meeting` - Instructor ends meeting
- `POST /api/sync-exchanges/sessions/:id/join` - Record join time
- `POST /api/sync-exchanges/sessions/:id/verify-code` - Verify code
- `POST /api/sync-exchanges/sessions/:id/confirm` - Confirm attendance
- `POST /api/sync-exchanges/sessions/:id/rate` - Rate participant
- `DELETE /api/sync-exchanges/sessions/:id` - Cancel session

### Sync Review Endpoints

- `POST /api/sync-exchanges/:id/review` - Submit cycle review
- `GET /api/sync-exchanges/:id/review` - Check existing review

### Messages Endpoints

- `GET /api/messages/exchange/:id` - Get messages for exchange/cycle
- `POST /api/messages` - Send message
- `POST /api/messages/mark-read/:id` - Mark as read

### Matching Endpoints

- `GET /api/matches/async/:skill` - Find async matches for skill
- `GET /api/matching/preferences` - Get matching preferences
- `PUT /api/matching/preferences` - Update preferences

### Credits & Payments Endpoints

- `GET /api/transactions` - Transaction history
- `GET /api/transactions/balance` - Current credit balance
- `GET /api/transactions/summary` - Earned, spent, balance summary
- `POST /api/payments/create-checkout-session` - Buy credits (Stripe)
- `GET /api/payments/session/:id` - Verify purchase
- `POST /api/payments/webhook` - Stripe webhook
- `GET /api/payments/history` - Purchase history

### Reports Endpoints

- `POST /api/reports` - Submit a report

### Notifications Endpoints

- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read

### Admin Endpoints

- `POST /api/admin/login` - Admin login
- `GET /api/admin/users` - List all users
- `POST /api/admin/suspend-account` - Suspend/reactivate user
- `DELETE /api/admin/delete-account` - Delete user account (cascade)
- `POST /api/admin/reset-password` - Reset user password
- `POST /api/admin/create-admin` - Create admin account
- `GET /api/admin/admins` - List admin accounts
- `GET /api/admin/reports` - List reports (filterable)
- `GET /api/admin/reports/statistics` - Report statistics
- `GET /api/admin/reports/:id` - Get report details
- `PUT /api/admin/reports/:id/status` - Update report status
- `PUT /api/admin/reports/:id/notes` - Add admin notes
- `DELETE /api/admin/reports/:id` - Delete report
- `POST /api/admin/send-message` - Send message to user
- `GET /api/admin/reports/:id/messages` - Report message log
- `GET /api/admin/analytics` - Platform analytics
- `GET /api/admin/analytics/exchanges` - Detailed exchange data
- `GET /api/admin/analytics/skills` - Skills with request counts
- `GET /api/admin/analytics/sessions` - Session monitoring data
- `GET /api/admin/session-monitor` - Session audit (flagged sessions)
- `POST /api/admin/sessions/:id/resolve-escrow` - Resolve escrow (refund/release)
- `POST /api/admin/sessions/:id/terminate` - Terminate exchange
- `POST /api/admin/jobs/run-matches` - Trigger async match generation
- `POST /api/admin/jobs/run-cycles` - Trigger cycle detection
- `POST /api/admin/jobs/run-all` - Trigger all matching jobs

---

## Frontend Application

### Application Structure

The frontend is a React 19 application built with TypeScript and Vite. It uses React Router for client-side routing and Context API for state management.

### Key Contexts

**AuthContext** - Manages authentication and user state:
- User login/logout
- JWT token management (httpOnly cookies + localStorage fallback)
- User profile data
- Exchange requests
- Transaction history
- Credit balance calculations

**ThemeContext** - Manages dark/light theme switching

### Routing Structure

**Public Routes:**
- `/` - Landing page
- `/about` - About page
- `/login` - User login
- `/register` - User registration
- `/forgot-password` - Password recovery

**Protected Routes (requires authentication):**
- `/dashboard` - Main dashboard
- `/browse` - Skill browsing
- `/profile` - User profile
- `/messages` - Messaging center
- `/transactions` - Transaction history
- `/requests` - Exchange requests
- `/create-skill` - Skill creation
- `/my-skills` - User's skills
- `/edit-skill/:skillId` - Skill editing
- `/matches` - Skill matches
- `/exchange/:exchangeId` - Async exchange workspace
- `/sync-exchange/:cycleId` - Sync exchange workspace
- `/credit-store` - Credit purchase
- `/user/:userId` - Public user profile
- `/change-password` - Password change

**Admin Routes (requires admin authentication):**
- `/admin` - Admin login
- `/admin/dashboard` - Admin dashboard
- `/admin/reports` - Report management
- `/admin/user-reports` - User-specific reports
- `/admin/session-monitor` - Session monitoring

### Component Hierarchy

```
App
├── AuthProvider
│   ├── Router
│   │   ├── Public Routes
│   │   │   ├── Landing
│   │   │   ├── Login
│   │   │   └── Register
│   │   ├── Protected Routes
│   │   │   ├── Navbar
│   │   │   ├── Dashboard
│   │   │   ├── Browse
│   │   │   ├── Profile
│   │   │   ├── Messages
│   │   │   └── ...
│   │   └── Admin Protected Routes
│   │       ├── Admin Dashboard
│   │       ├── Admin Reports
│   │       └── ...
```

### State Management

- **AuthContext** - Global authentication state
- **Local State** - useState hooks for component-specific state
- **URL Parameters** - React Router useParams for route parameters
- **Context Providers** - Theme context for theming

### API Integration

All API calls go through Axios with:
- Base URL from environment variable
- httpOnly cookie support (credentials: true)
- Authorization header fallback
- Error handling with user-friendly messages

### Styling

- **TailwindCSS** - Utility-first CSS framework
- **Custom CSS** - Global styles in index.css
- **Material UI** - Additional UI components
- **Headless UI** - Accessible component primitives

---

## Core Features

### Authentication & Security

**Institutional Email Only:**
- University of Botswana students only (studentID@ub.ac.bw)
- Student ID validation: 9-digit format (2022XXXXX)

**OTP Email Verification:**
- 6-digit codes via Resend.com
- 15-minute expiration
- Resend functionality

**Password Reset:**
- Self-service OTP-based password reset
- Forgot password → verify code → set new password

**JWT Authentication:**
- Secure token-based sessions
- Configurable expiration (default 7 days)
- httpOnly cookies for security
- Authorization header fallback

**Account Suspension:**
- Admins can suspend and reactivate accounts
- Suspended users blocked from access

### Skill Management

**Dynamic Skill Creation:**
- Create skill offers and requests
- Automatic credit pricing based on category
- 8 skill categories with search/filter

**Credit Pricing:**
- 3 credits: Programming, Mathematics, Science, Engineering
- 2 credits: Design, Languages, Business, Arts

**User Skill Fields:**
- "Skills I can teach" (skills_possessing)
- "Skills I want to learn" (skills_interested_in)

### Async Exchange System (One-to-One, Credit-Based)

**Credit Escrow:**
- Credits reserved from learner's wallet when request created
- Held securely until sessions completed
- Refunded if request declined/cancelled

**Session Scheduling:**
- Instructor creates sessions with date, duration, Jitsi link
- Verification codes auto-generated (ABC-123-XYZ format)

**Dual Confirmation:**
- Instructor marks complete (reveals code)
- Learner enters code to confirm attendance
- Fractional credit release per completed session

**Progress Tracking:**
- Real-time session count and credit release progress
- Session join tracking (both participants)
- Post-exchange reviews (learner rates instructor)

### Sync Exchange System (Multi-Party Cycles, Credit-Free)

**Cycle Detection:**
- Automatic detection of exchange cycles (3-5 participants)
- Graph algorithms for cycle finding
- Fuzzy skill resolution for non-identical phrasings

**Cycle Proposals:**
- Users review and accept/reject proposed cycles
- Auto-activation when all participants accept

**Per-Pair Sessions:**
- Each skill pair has own session count and schedule
- Instructors create sessions for their skill pair
- Group chat for all participants

**Cycle Completion:**
- All session pairs completed → cycle marked complete
- Participants review each other
- One active sync exchange per user limit

### Credit System

**Time Banking:**
- Credit value based on skill category (2 or 3 credits)
- Welcome bonus: 10 starting credits for new users

**Credit Store:**
- Purchase credits via Stripe (P20/credit)
- Webhook confirmation for payment processing
- Transaction history with audit trail

**Escrow System:**
- Credits held securely during active exchanges
- Admin escrow resolution (refund/release) with audit trail

**Transaction Types:**
- escrow, release, refund, purchase, welcome_bonus, admin_adjustment

### Messaging & Communication

**Exchange Workspace Chat:**
- Messaging within async exchange workspaces
- Real-time message sending/receiving

**Sync Cycle Group Chat:**
- Shared chat for all cycle participants

**Admin Messaging:**
- NEXUS Admin system user can contact users directly
- From reports or escrow actions

**System Messages:**
- Automatic notifications for admin actions
- Terminations, escrow resolutions

**Notification System:**
- Unread message and request indicators
- Notification types: new_request, request_accepted, session_scheduled, cycle_proposed, etc.

### User Profiles

**Profile Pictures:**
- Upload to Cloudinary
- CDN-delivered, auto-cropped to 400x400
- Face detection for optimal cropping

**Academic Transcripts:**
- Optional PDF transcript upload
- Stored locally with authenticated access
- Only owner or admin can view

**Ratings & Reviews:**
- Unified rating system (async + sync reviews)
- Bayesian-smoothed average rating
- Review count tracking

**Availability Settings:**
- Set when you're available to teach/learn

### Admin Panel

**Analytics Dashboard:**
- Total users, active exchanges, total skills, completed sessions

**Exchange Management:**
- View active, completed, terminated exchanges (async + sync)
- Session monitoring with flagging for suspicious durations

**Escrow Management:**
- Resolve remaining escrow credits
- Refund to learner or release to instructor
- Complete audit trail

**Exchange Termination:**
- Administratively terminate active exchanges
- System messages to both parties

**User Management:**
- View all users, suspend/reactivate accounts
- Delete accounts with cascading cleanup
- Direct password reset

**Report Management:**
- Full report lifecycle (pending, under review, resolved, dismissed)
- Admin notes and message logs
- Direct user messaging from report context

**Admin Accounts:**
- Create and manage admin accounts
- Login tracking

**Matching Job Triggers:**
- Manually trigger async match generation
- Manually trigger cycle detection
- Trigger both together

**Skills Analytics:**
- View skill listings with request counts

---

## Security Implementation

### Authentication Security

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

**Password Hashing:**
- bcryptjs with salt rounds
- Hashed before storage

**JWT Security:**
- Strong secret key (64+ chars recommended)
- Configurable expiration
- httpOnly cookies (primary)
- Authorization header fallback
- Session invalidation on password change

### API Security

**Rate Limiting:**
- Production: 300 requests/15 minutes
- Development: 1000 requests/15 minutes
- Configurable per environment

**Security Headers:**
- Helmet middleware for security headers
- CORS strict origin allowlist
- Production domain only
- Vercel subdomain support

**Input Validation:**
- Express validator for request validation
- Type checking on all inputs
- SQL injection prevention (parameterized queries)

### File Upload Security

**Profile Pictures:**
- Cloudinary secure HTTPS URLs
- File type validation
- Size limits

**Transcripts:**
- PDF only
- Filename format validation

### Database Security

**SQL Injection Prevention:**
- Parameterized queries (pg library)
- No string concatenation in queries

**Access Control:**
- Row-level security via application logic
- Foreign key constraints
- Check constraints for data integrity

**Sensitive Data:**
- Passwords hashed (never stored plain)
- OTP codes expire after 15 minutes
- JWT secrets in environment variables

### Admin Security

**Admin Authentication:**
- Separate admin accounts
- Separate authentication middleware
- Admin-only protected routes

**Audit Trail:**
- All admin actions logged
- Escrow resolutions tracked
- User suspension reasons recorded

### Transport Security

**HTTPS:**
- Required in production
- SSL/TLS encryption
- Secure cookie flags

**Cross-Origin:**
- Strict CORS configuration
- Origin allowlist
- Credentials support

---

## Matching Algorithm

### Overview

NEXUS uses a sophisticated graph-based matching algorithm to connect learners with teachers and detect multi-party exchange cycles.

### Asynchronous Matching (One-to-One)

**Graph-Based Scoring:**
- Finds one-to-one teacher matches for requested skills
- Restricted to instructors with published skill cards (no "ghost" matches)

**Fuzzy Skill Resolution:**
- Learner interests match skill cards via:
  - Substring overlap in either direction
  - Shared meaningful word tokens (length ≥ 4)
- Example: "business skills" matches "Business plan writing"

**Score Composition (out of 100):**

1. **Rating (55 points)**
   - Bayesian-smoothed average
   - 3.0/5 prior over 3 phantom reviews
   - Monotonic in review count
   - Strong reviews always outrate unrated peers

2. **Match Quality (35/22/12 points)**
   - 35 points: Exact title match
   - 22 points: Substring overlap
   - 12 points: Single-token overlap

3. **Recency (5 points)**
   - Skill card has a `created_at` timestamp

4. **Activity (up to 5 points)**
   - Small bump capped at 5 reviews

**Excluded Signals:**
- Availability (not meaningful for virtual platform)
- Location (single-campus, fully virtual)

**Zombie Recovery:**
- Matches with rejected/cancelled/expired requests automatically reappear as bookable

### Synchronous Cycle Detection (Multi-Party)

**Graph Construction:**
- Directed graph with users as nodes
- Offer edges from published skill cards (`skills` table)
- Want edges from `skills_interested_in`
- Same fuzzy resolution as async matching

**Cycle Detection Algorithm:**
- Detects cycles of 2-5 participants
- Minimum 3 participants for multi-party sync exchanges
- Graph traversal with cycle detection
- Score calculation for cycle quality

**Cycle Scoring:**
- Average match score of all edges in cycle
- Cycle length penalty (longer cycles slightly lower score)
- Participant activity bonus

**Duplicate Prevention:**
- Filters proposed cycles that duplicate already-completed participant sets
- Uses sorted user ID sets for comparison

### Scheduled Jobs

**Async Match Generation:**
- Runs every 6 hours (configurable)
- Processes all active users with interested skills
- Generates matches for each skill interest
- Logs match counts and errors

**Cycle Detection:**
- Runs every 6 hours (configurable)
- Clears graph cache for fresh data
- Detects cycles from skill graph
- Filters duplicates
- Persists new cycles

**Login Trigger:**
- Fire-and-forget job trigger on user login
- 5-minute cooldown to prevent excessive runs
- Runs both async and cycle detection

**Nightly Cleanup:**
- Runs daily at 2 AM
- Deletes expired OTP codes
- Deletes unverified accounts older than 24 hours

### Matching Preferences

User-configurable options:
- `prefer_async` - Prefer async exchanges
- `prefer_sync` - Prefer sync exchanges
- `min_match_score` - Minimum acceptable score (0-100)
- `max_cycle_length` - Maximum cycle length (2-5)
- `auto_suggest` - Auto-generate suggestions
- `receive_cycle_notifications` - Receive cycle proposals
- `preferred_days` - Preferred meeting days
- `preferred_times` - Preferred meeting times

---

## Deployment

### Environment Setup

**Backend Environment Variables:**
```
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-domain.com

DATABASE_URL=postgresql://username:password@host:5432/nexus_db

JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_EXPIRES_IN=7d

RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=NEXUS <noreply@yourdomain.com>

STRIPE_SECRET_KEY=sk_live_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>

JOB_ENABLED=true
JOB_SCHEDULE_MATCHES=0 */6 * * *
JOB_SCHEDULE_CYCLES=0 */6 * * *
```

**Frontend Environment Variables:**
```
VITE_API_URL=https://your-backend-api.com/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key
```

### Railway Deployment (Backend)

1. **Create Railway Project:**
   - Connect GitHub repository
   - Select backend directory as root

2. **Configure Variables:**
   - Add all environment variables
   - Set NODE_ENV=production
   - Configure PostgreSQL addon

3. **Deploy:**
   - Railway auto-deploys on push
   - Health check: `/api/health`

4. **Stripe Webhook:**
   - Configure webhook URL in Stripe Dashboard
   - Add webhook secret to environment variables

### Vercel Deployment (Frontend)

1. **Create Vercel Project:**
   - Connect GitHub repository
   - Select frontend directory as root

2. **Configure Build:**
   - Framework: Vite
   - Build command: `npm run build`
   - Output directory: `dist`

3. **Add Environment Variables:**
   - VITE_API_URL (backend URL)
   - VITE_STRIPE_PUBLISHABLE_KEY

4. **Deploy:**
   - Vercel auto-deploys on push
   - Custom domain configuration

### Database Setup

**Local Development:**
```bash
# Create database
createdb nexus_db

# Run schema
psql nexus_db < database/schema.sql

# Run seed data
psql nexus_db < database/seed.sql

# Run migrations
node database/setup.js
```

**Production (Railway PostgreSQL):**
- Database created automatically
- Run migrations via Railway CLI or deployment hooks
- Connection string in DATABASE_URL

### SSL/HTTPS Configuration

**Frontend (Vercel):**
- Automatic SSL certificate
- HTTPS only

**Backend (Railway):**
- Automatic SSL certificate
- HTTPS only
- Secure cookie flags enabled

---

## Development Guide

### Prerequisites

- Node.js (v18+)
- PostgreSQL (v14+)
- Resend.com account (for email)
- Stripe account (for payments)
- Cloudinary account (for profile pictures)

### Local Development Setup

**1. Clone Repository:**
```bash
git clone <repository-url>
cd "Final Year Project"
```

**2. Backend Setup:**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

**3. Frontend Setup:**
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

**4. Database Setup:**
```bash
cd database
npm install
# Create PostgreSQL database
createdb nexus_db
# Run schema
psql nexus_db < schema.sql
# Run seed data
psql nexus_db < seed.sql
# Run setup script
node setup.js
```

**5. Access Application:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api
- Health check: http://localhost:5000/api/health

### Testing

**Manual Testing Checklist:**
- User registration with OTP verification
- Login and JWT authentication
- Skill creation and browsing
- Async exchange flow (request → accept → sessions → review)
- Sync exchange flow (proposal → accept → sessions → review)
- Credit purchase via Stripe
- Messaging system
- Admin panel functions
- Report submission and resolution
- Session monitoring

### Common Development Tasks

**Adding a New API Endpoint:**
1. Create route handler in `/backend/routes/`
2. Add authentication middleware if needed
3. Implement business logic in service layer
4. Add database queries in models
5. Test endpoint with Postman/curl

**Adding a New Frontend Page:**
1. Create page component in `/frontend/src/pages/`
2. Add route in `/frontend/src/App.tsx`
3. Implement UI with TailwindCSS
4. Add API calls via AuthContext or axios
5. Test navigation and functionality

**Database Migration:**
1. Create migration SQL file in `/database/`
2. Add migration runner in `/backend/config/migrations.js`
3. Test migration on local database
4. Document migration in README

### Debugging

**Backend Debugging:**
- Console logs for request/response
- Morgan logging middleware
- Database query logging (development only)
- Error handling with stack traces

**Frontend Debugging:**
- React DevTools
- Browser console for errors
- Network tab for API calls
- AuthContext state inspection

### Performance Optimization

**Backend:**
- Database connection pooling (max 20 clients)
- Query optimization with indexes
- Rate limiting to prevent abuse
- Caching for frequent queries

**Frontend:**
- Code splitting with React.lazy
- Image optimization (Cloudinary)
- Lazy loading for components
- Debouncing for search inputs

### Code Style

**Backend:**
- CommonJS modules
- Async/await for async operations
- Error handling with try/catch
- Consistent naming conventions

**Frontend:**
- TypeScript for type safety
- Functional components with hooks
- Context API for state management
- TailwindCSS for styling

### Git Workflow

**Branch Naming:**
- `feature/feature-name`
- `bugfix/bug-description`
- `hotfix/critical-fix`

**Commit Messages:**
- Conventional Commits format
- `feat: add new feature`
- `fix: resolve bug`
- `docs: update documentation`

---

## Appendix

### Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

### Status Codes

**Exchange Status:**
- `pending` - Awaiting instructor response
- `accepted` - Instructor accepted, in progress
- `declined` - Instructor declined
- `in_progress` - Sessions being conducted
- `completed` - All sessions completed
- `cancelled` - Cancelled by user
- `terminated` - Terminated by admin
- `disputed` - Under dispute

**Cycle Status:**
- `proposed` - Awaiting participant responses
- `pending` - Some participants accepted
- `active` - All accepted, sessions in progress
- `completed` - All sessions completed
- `rejected` - Rejected by participant

**Report Status:**
- `pending` - Awaiting admin review
- `under_review` - Admin investigating
- `resolved` - Issue resolved
- `dismissed` - Report dismissed

### Contact Information

**Project Maintainer:** [Your Name]
**Institution:** University of Botswana
**Department:** Computer Science
**Email:** [your.email@ub.ac.bw]

### License

This project is part of a BSc Computer Science Final Year Project at the University of Botswana.

---

**Document Version:** 1.0.0  
**Last Updated:** April 2026  
