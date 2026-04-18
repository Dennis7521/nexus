# Sync Exchange Reviews Implementation

This implementation adds support for reviews on sync exchange pairs (multi-party cycles) that are merged with async exchange reviews on user profiles.

## Files Created/Modified

### Backend
1. **`backend/migrations/add_cycle_reviews.sql`** - Migration to create cycle_reviews table
2. **`backend/run-cycle-reviews-migration.js`** - Migration runner script
3. **`backend/models/User.js`** - Updated `getUserReviews()` to merge both review types
4. **`backend/routes/syncExchanges.js`** - Added review endpoints for sync exchanges

## API Endpoints

### Submit Sync Exchange Review
```
POST /api/sync-exchanges/:cycleId/review
Authorization: Bearer <token>
Body: { rating: 1-5, comment: "optional text" }
```

### Check Existing Review
```
GET /api/sync-exchanges/:cycleId/review
Authorization: Bearer <token>
```

## How It Works

1. **Unified Display**: Reviews from both async exchanges (`exchange_reviews` table) and sync exchanges (`cycle_reviews` table) are merged into a single list on user profiles

2. **No Differentiation**: Reviews appear identically on the profile - no visual distinction between sync and async reviews

3. **Rating Aggregation**: Both types of reviews contribute to the user's `total_rating` and `rating_count` via database triggers

4. **Skill Association**: Each review is tagged with the skill title that was taught

## Setup Instructions

1. Run the migration:
   ```bash
   cd backend
   node run-cycle-reviews-migration.js
   ```

2. The migration creates:
   - `cycle_reviews` table
   - Indexes for performance
   - Triggers to auto-update user ratings from both review types

## User Workflow

1. User completes a sync exchange (cycle)
2. User submits a review via `POST /api/sync-exchanges/:cycleId/review`
3. Review appears on the teacher's profile alongside async reviews
4. Review contributes to the teacher's overall rating

## Database Schema

```sql
cycle_reviews:
- id (SERIAL PRIMARY KEY)
- cycle_id (INTEGER, FK to exchange_cycles)
- reviewer_id (UUID, FK to users)
- reviewee_id (UUID, FK to users - the teacher)
- skill_title (VARCHAR)
- rating (INTEGER 1-5)
- comment (TEXT)
- created_at (TIMESTAMP)
```
