# NEXUS - Skill Exchange Platform

NEXUS is an intelligent, non-monetary skill-exchange platform designed specifically for University of Botswana students. The system enables peer-to-peer learning through a time-banking credit system where students teach skills they possess to earn credits, which they can spend to learn skills from others. It also supports credit-free multi-party exchange cycles where groups of 3–5 students teach each other in a round-robin fashion.

## Project Structure

```
Final Year Project/
├── frontend/          # React 18 + TypeScript + Vite + TailwindCSS
├── backend/           # Node.js + Express.js REST API
├── database/          # PostgreSQL schema, seeds & migrations
└── README.md
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Lucide Icons
- **Backend**: Node.js, Express.js, PostgreSQL (pg), JWT
- **Payments**: Stripe (Credit Store)
- **Email**: Resend.com (OTP verification, password reset emails)
- **Video Meetings**: Jitsi (auto-generated anonymous rooms)
- **File Storage**: Cloudinary (profile pictures) + local disk via Multer (academic transcripts)
- **Scheduling**: node-cron (background matching jobs)

## Core Features

### Authentication & Security
- **Institutional Email Only**: University of Botswana students only (`studentID@ub.ac.bw`)
- **Student ID Validation**: 9-10 digit format (2022XXXXX)
- **OTP Email Verification**: 6-digit codes via Resend.com
- **Password Reset**: Self-service OTP-based password reset (forgot password → verify code → set new password)
- **JWT Authentication**: Secure token-based sessions with configurable expiration
- **Account Suspension**: Admins can suspend and reactivate user accounts

### Skill Management
- **Dynamic Skill Creation**: Create skill offers and requests with automatic credit pricing
- **Credit Pricing**:
  - 3 credits: Programming, Mathematics, Science, Engineering
  - 2 credits: Design, Languages, Business, Arts
- **8 Skill Categories**: Searchable and filterable listings
- **User Skill Fields**: Separate "skills I can teach" and "skills I want to learn"

### Async Exchange System (One-to-One, Credit-Based)
- **Credit Escrow**: Credits reserved from the learner's wallet when a request is created, held securely until sessions are completed
- **Session Scheduling**: Instructor creates sessions with date, duration, and Jitsi meeting link
- **Verification Codes**: Auto-generated codes (ABC-123-XYZ format) for session completion
- **Dual Confirmation**: Instructor marks complete (reveals code), learner enters code to confirm attendance
- **Fractional Credit Release**: Credits released proportionally per completed session
- **Progress Tracking**: Real-time session count and credit release progress
- **Session Join Tracking**: Records when each participant joins the meeting
- **Post-Exchange Reviews**: Learner rates and reviews the instructor after exchange completion

### Sync Exchange System (Multi-Party Cycles, Credit-Free)
- **Cycle Detection**: Automatic detection of exchange cycles (3–5 participants) using graph algorithms
- **Cycle Proposals**: Users review and accept/reject proposed cycles
- **Per-Pair Sessions**: Each skill pair within a cycle has its own session count and schedule
- **Session Management**: Create, join, end meetings, confirm attendance with verification codes
- **Jitsi Integration**: Auto-generated anonymous meeting rooms
- **Cycle Reviews**: Participants review each other after cycle completion
- **Active Cycle Tracking**: Each user can have one active sync exchange at a time

### Credit System
- **Time Banking**: Credit value based on skill category (2 or 3 credits)
- **Credit Store**: Purchase credits via Stripe (P20/credit) with webhook confirmation
- **Welcome Bonus**: New users receive 10 starting credits
- **Escrow System**: Credits held securely during active exchanges
- **Transaction History**: Complete audit trail of all credit movements (earned, spent, escrow, refunds, purchases)
- **Balance Summary**: Total earned, total spent, and current balance

### Messaging & Communication
- **Exchange Workspace Chat**: Messaging within async exchange workspaces
- **Sync Cycle Group Chat**: Shared chat for all participants in a multi-party cycle
- **Admin Messaging**: NEXUS Admin system user can contact users directly (from reports or escrow actions)
- **System Messages**: Automatic notifications for admin actions (terminations, escrow resolutions)
- **Notification System**: Unread message and request indicators

### User Profiles
- **Profile Pictures**: Upload and manage profile photos stored on Cloudinary (CDN-delivered, auto-cropped to 400x400 with face detection)
- **Academic Transcripts**: Optional PDF transcript upload stored locally with authenticated access (only owner or admin can view)
- **Ratings & Reviews**: Unified rating system merging both async exchange reviews and sync cycle reviews
- **Availability Settings**: Set when you're available to teach/learn

### Admin Panel
- **Analytics Dashboard**: Total users, active exchanges (async + sync), total skills, completed sessions
- **Exchange Management**: View active, completed, and terminated exchanges (both async and sync)
- **Session Monitoring**: Audit all sessions with flagging for suspiciously short durations
- **Escrow Management**: Resolve remaining escrow credits — refund to learner or release to instructor with audit trail
- **Exchange Termination**: Administratively terminate an active exchange with system messages to both parties
- **User Management**: View all users, suspend/reactivate accounts, delete accounts (cascading cleanup)
- **Report Management**: Full report lifecycle — pending, under review, resolved, dismissed — with admin notes and message logs
- **Password Reset**: Admin can directly reset a user's password
- **Admin Accounts**: Create and manage admin accounts
- **Admin Messaging**: Contact users directly from report context, with conversation log
- **Matching Job Triggers**: Manually trigger async match generation, cycle detection, or both
- **Skills Analytics**: View skill listings with request counts

### Matching Algorithm
- **Asynchronous Matching**: Graph-based scoring to find one-to-one teacher matches for a requested skill, restricted to instructors with a published skill card (no "ghost" matches against profile keywords)
- **Fuzzy Skill Resolution**: Learner interests match skill cards via substring overlap in either direction OR shared meaningful word tokens (length ≥ 4), e.g. "business skills" matches "Business plan writing"
- **Synchronous Cycle Detection**: Detects multi-party exchange cycles (3–5 users) from a directed graph whose **offer** edges are sourced from published skill cards (`skills` table) and whose **want** edges come from `skills_interested_in`. Uses the same fuzzy resolution rules as async, so cycles can close across non-identical phrasings (e.g. interest "Python" → card "Python for Data Analysis")
- **Score Composition (out of 100)**:
  - **Rating (55)** — Bayesian-smoothed average using a 3.0/5 prior over 3 phantom reviews, monotonic in review count so a teacher with several strong reviews always outranks an unrated peer
  - **Match Quality (35/22/12)** — exact title match, substring overlap, or single-token overlap respectively
  - **Recency (5)** — skill card has a `created_at`
  - **Activity (up to 5)** — small bump capped at 5 reviews
  - *Availability and location were deliberately excluded*: NEXUS is a single-campus, fully virtual platform (UB students, Jitsi sessions), so neither signal is meaningful in this context.
- **Zombie Recovery**: Matches whose request was rejected, cancelled, expired, or never created (legacy chat-only contacts) automatically reappear as bookable
- **Scheduled Jobs**: Cron-based background jobs for match generation and cycle detection
- **Duplicate Prevention**: Filters proposed cycles that duplicate already-completed participant sets

## Database Schema

### User & Auth Tables
- `users` — User accounts with profile data, credit balance, ratings, suspension status, and active sync exchange reference
- `admins` — Admin accounts with username, password hash, and login tracking
- `otps` — Email verification and password reset OTP codes with expiry

### Skill Tables
- `skill_categories` — 8 predefined categories (Programming, Design, Mathematics, etc.)
- `skills` — Skill listings (offers and requests) with category, pricing, and metadata

### Async Exchange Tables
- `exchange_requests` — Exchange proposals with status, escrow tracking, session count, and credit amounts
- `exchange_sessions` — Scheduled sessions with verification codes, join timestamps, duration tracking, and completion status
- `exchange_reviews` — Post-exchange reviews (one per exchange, learner reviews instructor)

### Sync Exchange Tables
- `exchange_cycles` — Multi-party cycle metadata (length, score, status, session counts, exchange mode)
- `cycle_participants` — Per-user cycle membership with position, skill offering/receiving, and acceptance status
- `sync_exchange_sessions` — Sessions for sync cycles with per-pair scheduling, verification codes, join timestamps, and confirmations
- `cycle_reviews` — Post-cycle reviews merged with exchange reviews on user profiles

### Credit & Transaction Tables
- `transactions` — All credit movements: escrow, release, refund, purchase, admin actions, welcome bonus
- `credit_purchases` — Stripe payment records with session ID, credits purchased, and amount paid

### Communication Tables
- `messages` — Conversation messages tied to exchange requests, supporting text and system messages
- `notifications` — User notification tracking with type, related entity, and read status

### Matching Tables
- `skill_matches` — Algorithmically generated match suggestions between learners and teachers
- `matching_preferences` — Per-user matching preferences for algorithm tuning

### Moderation Tables
- `reports` — User-generated reports with status lifecycle, admin notes, and resolution tracking

## Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+)
- Resend.com account (for email)
- Stripe account (for payments)
- Cloudinary account (for profile picture storage)

### Installation

1. **Clone and Install**
   ```bash
   cd frontend && npm install
   cd ../backend && npm install
   ```

2. **Database Setup**
   - Create a PostgreSQL database
   - Run `database/schema.sql` to create the base schema
   - Run `database/seed.sql` to seed skill categories
   - Run migrations from `backend/migrations/` and `database/migrations/`

3. **Environment Configuration**
   - Copy `.env.example` to `.env` in both `frontend/` and `backend/`
   - Fill in your database URL, JWT secret, Resend API key, Stripe keys, and Cloudinary connection string (`CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>`)

4. **Start Development**
   ```bash
   # Backend
   cd backend && npm run dev
   
   # Frontend (new terminal)
   cd frontend && npm run dev
   ```

5. **Access Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000/api
   - Health check: http://localhost:5000/api/health

## Exchange Workflows

### Async Exchange (One-to-One)
1. **Request**: Learner requests a skill — credits move from wallet to escrow
2. **Accept**: Instructor accepts the request, workspace and chat open
3. **Schedule**: Instructor creates a session with date, duration, and Jitsi meeting link
4. **Meet**: Both users join the meeting; join times are recorded
5. **Confirm**: Instructor marks complete — verification code is revealed
6. **Verify**: Learner enters the code to confirm attendance
7. **Credits Released**: Fractional credits transfer from escrow to instructor
8. **Repeat**: Steps 3–7 repeat for each session until all are completed
9. **Review**: Learner rates and reviews the instructor

### Sync Exchange (Multi-Party Cycle)
1. **Detection**: System detects exchange cycles from the skill graph (3–5 participants)
2. **Proposal**: Cycle is proposed to all participants for review
3. **Accept**: All participants accept — cycle becomes active
4. **Session Counts**: Each instructor sets the number of sessions for their skill pair
5. **Schedule**: Instructors create sessions with Jitsi meeting links
6. **Meet & Confirm**: Participants join, instructor ends meeting, all confirm attendance
7. **Complete**: All session pairs completed — cycle marked as completed
8. **Review**: Participants rate and review each other

## API Endpoints

### Authentication
- `POST /api/auth/register` — Register with OTP
- `POST /api/auth/verify-email` — Verify OTP code
- `POST /api/auth/resend-otp` — Resend OTP
- `POST /api/auth/login` — User login
- `POST /api/auth/forgot-password` — Send password reset OTP
- `POST /api/auth/verify-reset-code` — Verify reset OTP code
- `POST /api/auth/reset-password` — Set new password with OTP
- `PUT /api/auth/change-password` — Change password (logged in)

### Users & Profiles
- `GET /api/auth/me` — Get current user
- `PUT /api/auth/profile` — Update profile
- `POST /api/auth/upload-profile-picture` — Upload avatar
- `POST /api/auth/upload-transcript` — Upload transcript
- `GET /api/users/:id` — Get user public profile

### Skills
- `GET /api/skills` — List all skills
- `POST /api/skills` — Create skill (auto-priced)
- `PUT /api/skills/:id` — Update skill
- `DELETE /api/skills/:id` — Delete skill

### Async Exchanges
- `POST /api/exchanges/request` — Create exchange request (escrow)
- `GET /api/exchanges/requests` — List exchange requests
- `GET /api/exchanges/user/all` — All exchanges for current user
- `GET /api/exchanges/completed` — Completed async exchanges
- `PUT /api/exchanges/accept/:id` — Accept request
- `PUT /api/exchanges/decline/:id` — Decline request (refund)
- `GET /api/exchanges/:id` — Get exchange details

### Async Sessions
- `POST /api/exchanges/:id/sessions` — Create session
- `GET /api/exchanges/:id/sessions` — List sessions
- `POST /api/exchanges/sessions/:id/confirm` — Mentor confirms complete
- `POST /api/exchanges/sessions/:id/verify-code` — Learner verifies code
- `POST /api/exchanges/sessions/:id/join` — Record join time
- `POST /api/exchanges/sessions/:id/rate` — Rate session
- `DELETE /api/exchanges/sessions/:id` — Cancel session

### Async Reviews
- `POST /api/exchanges/:id/review` — Submit exchange review
- `GET /api/exchanges/:id/review` — Check if already reviewed

### Sync Exchanges
- `GET /api/sync-exchanges/active` — Check active sync exchange
- `GET /api/sync-exchanges/cycles/my` — My cycle proposals
- `POST /api/sync-exchanges/cycles/:id/respond` — Accept/reject cycle
- `POST /api/sync-exchanges/:id/set-session-count` — Set session count
- `POST /api/sync-exchanges/:id/set-pair-session-count` — Set per-pair session count
- `GET /api/sync-exchanges/:id/workspace` — Cycle workspace data
- `GET /api/sync-exchanges/history` — Completed sync exchanges

### Sync Sessions
- `POST /api/sync-exchanges/:id/sessions` — Create sync session
- `POST /api/sync-exchanges/sessions/:id/end-meeting` — Instructor ends meeting
- `POST /api/sync-exchanges/sessions/:id/join` — Record join
- `POST /api/sync-exchanges/sessions/:id/verify-code` — Verify code
- `POST /api/sync-exchanges/sessions/:id/confirm` — Confirm attendance
- `POST /api/sync-exchanges/sessions/:id/rate` — Rate session
- `DELETE /api/sync-exchanges/sessions/:id` — Delete session

### Sync Reviews
- `POST /api/sync-exchanges/:id/review` — Submit cycle review
- `GET /api/sync-exchanges/:id/review` — Check existing review

### Messages
- `GET /api/messages/exchange/:id` — Get exchange messages
- `POST /api/messages` — Send message
- `POST /api/messages/mark-read/:id` — Mark as read

### Matching
- `GET /api/matches/async/:skill` — Find async matches for a skill
- `GET /api/matching/preferences` — Get matching preferences
- `PUT /api/matching/preferences` — Update matching preferences

### Credits & Payments
- `GET /api/transactions` — Transaction history
- `GET /api/transactions/balance` — Current credit balance
- `GET /api/transactions/summary` — Earned, spent, and balance summary
- `POST /api/payments/create-checkout-session` — Buy credits (Stripe)
- `GET /api/payments/session/:id` — Verify purchase
- `POST /api/payments/webhook` — Stripe webhook
- `GET /api/payments/history` — Purchase history

### Reports
- `POST /api/reports` — Submit a report

### Notifications
- `GET /api/notifications` — Get user notifications
- `PUT /api/notifications/:id/read` — Mark notification as read

### Admin
- `POST /api/admin/login` — Admin login
- `GET /api/admin/users` — List all users
- `POST /api/admin/suspend-account` — Suspend/reactivate user
- `DELETE /api/admin/delete-account` — Delete user account (cascade)
- `POST /api/admin/reset-password` — Reset a user's password
- `POST /api/admin/create-admin` — Create admin account
- `GET /api/admin/admins` — List admin accounts
- `GET /api/admin/reports` — List reports (filterable by status)
- `GET /api/admin/reports/statistics` — Report statistics
- `GET /api/admin/reports/:id` — Get report details
- `PUT /api/admin/reports/:id/status` — Update report status
- `PUT /api/admin/reports/:id/notes` — Add admin notes
- `DELETE /api/admin/reports/:id` — Delete report
- `POST /api/admin/send-message` — Send message to user
- `GET /api/admin/reports/:id/messages` — Report message log
- `GET /api/admin/analytics` — Platform analytics
- `GET /api/admin/analytics/exchanges` — Detailed exchange data
- `GET /api/admin/analytics/skills` — Skills with request counts
- `GET /api/admin/analytics/sessions` — Session monitoring data
- `GET /api/admin/session-monitor` — Session audit (flagged sessions)
- `POST /api/admin/sessions/:id/resolve-escrow` — Resolve escrow (refund/release)
- `POST /api/admin/sessions/:id/terminate` — Terminate exchange
- `POST /api/admin/jobs/run-matches` — Trigger async match generation
- `POST /api/admin/jobs/run-cycles` — Trigger cycle detection
- `POST /api/admin/jobs/run-all` — Trigger all matching jobs

## Security Features

- Password requirements: 8+ chars, uppercase, lowercase, number
- Rate limiting: configurable per environment (300 req/15min production, 1000 dev)
- Helmet security headers
- CORS: strict origin allowlist (production domain only)
- JWT token expiration (configurable)
- Admin-only protected routes with separate auth middleware
- Authenticated transcript access (owner or admin only)
- File upload validation (type and size)
- Cloudinary secure HTTPS URLs for profile pictures
- SQL injection prevention (parameterized queries)
- Directory traversal prevention on transcript file serving
- Escrow audit trail for all admin credit actions

## License
This project is part of a BSc Computer Science Final Year Project at the University of Botswana.

