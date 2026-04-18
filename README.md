# NEXUS - Skill Exchange Platform

NEXUS is an intelligent, non-monetary skill-exchange platform designed specifically for University of Botswana students. The system enables peer-to-peer learning through a time-banking credit system where students teach skills they possess to earn credits, which they can spend to learn skills from others.

## Project Structure

```
Final Year Project/
├── frontend/          # React.js + TypeScript frontend (Vite)
├── backend/           # Node.js + Express.js API
├── database/          # PostgreSQL migrations
└── README.md
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Lucide Icons
- **Backend**: Node.js, Express.js, PostgreSQL (pg), JWT
- **Payment**: Stripe (Credit Store)
- **Email**: Resend.com (OTP verification)
- **File Storage**: Local (Multer)

## Core Features

### Authentication & Security
- **Institutional Email Only**: University of Botswana students only (studentID@ub.ac.bw)
- **Student ID Validation**: 9-digit format (2022XXXXX)
- **OTP Email Verification**: 6-digit codes via Resend.com
- **Password Reset**: Admin-approved password reset workflow
- **JWT Authentication**: Secure token-based sessions

### Skill Management
- **Dynamic Skill Creation**: Create skill offers with automatic credit pricing
- **Credit Pricing**: 
  - 3 credits: Programming, Mathematics, Science, Engineering
  - 2 credits: Design, Languages, Business, Arts
- **Skill Categories**: 8 categories with searchable/filterable listings
- **User Skill Fields**: Separate "skills I can teach" and "skills I want to learn"

### Exchange System
- **Credit Escrow**: Credits reserved when exchange requested, released per session
- **Session Scheduling**: Mentor creates sessions with date, duration, meeting link
- **Verification Codes**: Auto-generated codes (ABC-123-XYZ format) for session completion
- **Dual Confirmation**: Both mentor and learner must confirm session completion
- **Progress Tracking**: Real-time session and credit release progress
- **Automatic Credit Release**: Fractional credits released per completed session

### Credit System
- **Time Banking**: 1 credit = value based on skill category
- **Credit Store**: Purchase credits via Stripe (P20/credit)
- **Welcome Bonus**: New users receive starting credits
- **Escrow System**: Credits held securely during exchanges
- **Transaction History**: Complete audit trail of all credit movements

### Messaging & Communication
- **Real-time Messaging**: Chat within exchange workspaces
- **Group Cycles**: Multi-party exchange coordination
- **Admin Messaging**: NEXUS Admin can contact users from reports
- **Notification System**: Unread message and request indicators

### User Profiles
- **Profile Pictures**: Upload and manage profile photos
- **Academic Transcripts**: Optional transcript upload for credibility
- **Ratings & Reviews**: Post-exchange rating system
- **Availability Settings**: Set when you're available to teach/learn

### Admin Features
- **User Reports**: Report management system (pending, under_review, resolved, dismissed)
- **Password Reset Management**: Review and approve user password reset requests
- **Analytics Dashboard**: Platform statistics and monitoring
- **User Management**: View, suspend, and manage user accounts
- **Admin Messaging**: Contact users directly from reports

### Matching Algorithm
- **Asynchronous Matching**: Credit-based one-to-one exchanges
- **Synchronous Matching (Cycles)**: Multi-party exchange cycles (3-5)
- **Graph-Based Scoring**: Match scoring based on skills, ratings, availability, proximity
- **Smart Recommendations**: Algorithmic skill and user suggestions

## Database Schema

### Core Tables
- `users` - User accounts with skill arrays and profile data
- `skills` - Skill listings (offers and requests)
- `exchange_requests` - Exchange proposals with escrow tracking
- `exchange_sessions` - Scheduled sessions with verification codes
- `credit_ledger` - Transaction history and balance tracking
- `messages` - Conversation threads
- `reports` - User-generated reports for admin review
- `credit_purchases` - Stripe payment records
- `otps` - Email verification codes
- `password_reset_requests` - Admin-managed password resets

### Additional Tables
- `admins` - Admin user accounts
- `exchange_cycles` - Multi-party cycle coordination
- `cycle_participants` - Cycle membership and status
- `skill_matches` - Algorithmic match suggestions
- `matching_preferences` - User matching settings
- `exchange_reviews` - Post-exchange ratings
- `notifications` - User notification tracking

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+)
- Resend.com account (for email)
- Stripe account (for payments)

### Installation

1. **Clone and Install**
   ```bash
   cd frontend && npm install
   cd ../backend && npm install
   ```

2. **Database Setup**
   - Create PostgreSQL database
   - Run migrations from `backend/migrations/` and `database/migrations/`

3. **Environment Configuration**
   - Copy `.env.example` to `.env` in both frontend and backend
   - Fill in your API keys and database URL

4. **Start Development**
   ```bash
   # Backend
   cd backend && npm run dev
   
   # Frontend (new terminal)
   cd frontend && npm run dev
   ```

5. **Access Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000/api

## Exchange Workflow

1. **Request Exchange**: Learner requests skill, credits moved to escrow
2. **Accept**: Instructor accepts, messaging opens
3. **Schedule Session**: Instructor creates session with meeting link
4. **Auto-Generated Code**: System creates verification code (hidden initially)
5. **Meeting**: Both users join via meeting link
6. **Mentor Confirms**: Instructor marks complete, sees verification code
7. **Learner Verifies**: Learner enters code to confirm attendance
8. **Credits Released**: Fractional credits transfer to instructor
9. **Rate & Review**: Learner rates the session quality

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register with OTP
- `POST /api/auth/verify-email` - Verify OTP code
- `POST /api/auth/resend-otp` - Resend OTP
- `POST /api/auth/login` - User login
- `POST /api/auth/request-password-reset` - Request reset
- `PUT /api/auth/change-password` - Change password

### Users & Profiles
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/upload-profile-picture` - Upload avatar
- `POST /api/auth/upload-transcript` - Upload transcript
- `GET /api/users/:id` - Get user profile

### Skills
- `GET /api/skills` - List all skills
- `POST /api/skills` - Create skill (auto-priced)
- `PUT /api/skills/:id` - Update skill
- `DELETE /api/skills/:id` - Delete skill

### Exchanges
- `POST /api/exchanges` - Create exchange request
- `GET /api/exchanges/my-exchanges` - List my exchanges
- `POST /api/exchanges/:id/accept` - Accept request
- `POST /api/exchanges/:id/decline` - Decline request
- `GET /api/exchanges/:id/workspace` - Get workspace data

### Sessions
- `POST /api/exchanges/:id/sessions` - Create session
- `POST /api/sessions/:id/complete` - Mark complete (mentor)
- `POST /api/sessions/:id/verify` - Verify code (learner)
- `GET /api/exchanges/:id/sessions` - List sessions

### Messages
- `GET /api/messages/exchange/:id` - Get exchange messages
- `POST /api/messages` - Send message
- `POST /api/messages/mark-read/:id` - Mark as read

### Credits & Payments
- `GET /api/credits/balance` - Get credit balance
- `GET /api/credits/transactions` - Transaction history
- `POST /api/payments/create-checkout-session` - Buy credits
- `GET /api/payments/session/:id` - Verify purchase

### Admin
- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/users` - List users
- `PUT /api/admin/users/:id/suspend` - Suspend user
- `GET /api/admin/reports` - View reports
- `PUT /api/admin/reports/:id/status` - Update report status
- `GET /api/admin/password-reset-requests` - List reset requests
- `POST /api/admin/password-reset-requests/:id/approve` - Approve reset

## Security Features

- Password requirements: 8+ chars, uppercase, lowercase, number
- Rate limiting: 3 OTP requests/hour per IP/email
- CORS protection
- JWT token expiration
- Admin-only protected routes
- File upload validation (type, size)
- SQL injection prevention (parameterized queries)

## License

This project is part of a BSc Computer Science Final Year Project at the University of Botswana.

