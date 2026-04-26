/**
 * Debug and fix Mothusi's average rating
 * Usage: node fix_mothusi_rating.js
 */
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

const isLocal = !process.env.DATABASE_URL
  || /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'nexus_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
    });

(async () => {
  const client = await pool.connect();
  try {
    console.log('=== Debugging Mothusi\'s Rating ===\n');

    // 1. Find Mothusi's user ID
    const userQ = await client.query(
      `SELECT id, first_name, last_name, total_rating, rating_count
       FROM users
       WHERE first_name ILIKE 'Mothusi'`
    );

    if (userQ.rows.length === 0) {
      console.log('ERROR: Mothusi not found in users table');
      process.exit(1);
    }

    const mothusi = userQ.rows[0];
    console.log(`Found user: ${mothusi.first_name} ${mothusi.last_name}`);
    console.log(`  ID: ${mothusi.id}`);
    console.log(`  Current total_rating: ${mothusi.total_rating}`);
    console.log(`  Current rating_count: ${mothusi.rating_count}`);
    console.log('');

    // 2. Check all reviews in exchange_reviews
    console.log('--- All exchange_reviews ---');
    const allReviewsQ = await client.query(
      `SELECT er.id, er.exchange_request_id, er.reviewer_id, er.reviewee_id,
              er.rating, er.comment, er.created_at,
              u1.first_name as reviewer_name,
              u2.first_name as reviewee_name
       FROM exchange_reviews er
       JOIN users u1 ON er.reviewer_id = u1.id
       JOIN users u2 ON er.reviewee_id = u2.id
       ORDER BY er.created_at DESC`
    );
    console.log(`Total exchange_reviews: ${allReviewsQ.rows.length}`);
    allReviewsQ.rows.forEach(r => {
      console.log(`  Review #${r.id}: ${r.reviewer_name} → ${r.reviewee_name}, rating=${r.rating}`);
    });
    console.log('');

    // 3. Check reviews where Mothusi is the reviewee (instructor being rated)
    console.log('--- Reviews for Mothusi (reviewee_id match) ---');
    const mothusiReviewsQ = await client.query(
      `SELECT er.id, er.rating, er.comment, er.created_at,
              u.first_name as reviewer_name
       FROM exchange_reviews er
       JOIN users u ON er.reviewer_id = u.id
       WHERE er.reviewee_id = $1`,
      [mothusi.id]
    );
    console.log(`Found ${mothusiReviewsQ.rows.length} reviews for Mothusi:`);
    let totalRating = 0;
    mothusiReviewsQ.rows.forEach(r => {
      console.log(`  Review #${r.id}: ${r.reviewer_name} rated ${r.rating} stars`);
      console.log(`    Comment: "${r.comment}"`);
      totalRating += parseInt(r.rating);
    });
    console.log('');

    // 4. Calculate and update if needed
    if (mothusiReviewsQ.rows.length > 0) {
      const avgRating = totalRating / mothusiReviewsQ.rows.length;
      console.log(`Calculated average: ${avgRating.toFixed(2)} (${totalRating}/${mothusiReviewsQ.rows.length})`);
      console.log('');

      // Check if the instructor_id from the exchange matches the reviewee_id
      console.log('--- Checking exchange instructor_id vs reviewee_id ---');
      const exchangeCheckQ = await client.query(
        `SELECT er.id as review_id, er.exchange_request_id, er.reviewee_id,
                ex.instructor_id, ex.requester_id,
                ins.first_name as instructor_name,
                req.first_name as requester_name
         FROM exchange_reviews er
         JOIN exchange_requests ex ON er.exchange_request_id = ex.id
         JOIN users ins ON ex.instructor_id = ins.id
         JOIN users req ON ex.requester_id = req.id
         WHERE er.reviewee_id = $1 OR ex.instructor_id = $1`,
        [mothusi.id]
      );
      console.log('Exchange/review link check:');
      exchangeCheckQ.rows.forEach(r => {
        console.log(`  Review #${r.review_id}: exchange #${r.exchange_request_id}`);
        console.log(`    Instructor: ${r.instructor_name} (${r.instructor_id})`);
        console.log(`    Reviewee ID in review: ${r.reviewee_id}`);
        console.log(`    Match: ${r.instructor_id === r.reviewee_id ? 'YES' : 'NO - MISMATCH!'}`);
      });
      console.log('');

      // FIX: Update Mothusi's rating
      console.log('--- FIXING Mothusi\'s rating ---');
      await client.query(
        `UPDATE users
         SET total_rating = $1, rating_count = $2
         WHERE id = $3`,
        [avgRating.toFixed(2), mothusiReviewsQ.rows.length, mothusi.id]
      );
      console.log(`✓ Updated Mothusi's rating to ${avgRating.toFixed(2)} with ${mothusiReviewsQ.rows.length} reviews`);

      // Verify
      const verifyQ = await client.query(
        `SELECT total_rating, rating_count FROM users WHERE id = $1`,
        [mothusi.id]
      );
      console.log(`\nVerification:`);
      console.log(`  total_rating: ${verifyQ.rows[0].total_rating}`);
      console.log(`  rating_count: ${verifyQ.rows[0].rating_count}`);
    } else {
      console.log('No reviews found for Mothusi as reviewee.');

      // Check if reviews exist with instructor_id but wrong reviewee_id
      console.log('\n--- Checking for mismatched reviewee_id ---');
      const mismatchQ = await client.query(
        `SELECT er.id, er.reviewee_id, er.rating, u.first_name as reviewee_name,
                ex.instructor_id, ins.first_name as instructor_name
         FROM exchange_reviews er
         JOIN exchange_requests ex ON er.exchange_request_id = ex.id
         JOIN users u ON er.reviewee_id = u.id
         JOIN users ins ON ex.instructor_id = ins.id
         WHERE ins.first_name ILIKE 'Mothusi'`
      );
      if (mismatchQ.rows.length > 0) {
        console.log('Found reviews where Mothusi is instructor but reviewee_id is different:');
        mismatchQ.rows.forEach(r => {
          console.log(`  Review #${r.id}: instructor=${r.instructor_name}, reviewee=${r.reviewee_name} (${r.reviewee_id})`);
        });

        // Fix the mismatched reviews
        console.log('\n--- FIXING mismatched reviewee_id ---');
        let totalRating = 0;
        for (const row of mismatchQ.rows) {
          await client.query(
            `UPDATE exchange_reviews SET reviewee_id = $1 WHERE id = $2`,
            [row.instructor_id, row.id]
          );
          console.log(`  Fixed review #${row.id}: set reviewee_id to ${row.instructor_id}`);
          totalRating += parseInt(row.rating);
        }

        // Recalculate and update
        const avgRating = totalRating / mismatchQ.rows.length;
        await client.query(
          `UPDATE users
           SET total_rating = $1, rating_count = $2
           WHERE id = $3`,
          [avgRating.toFixed(2), mismatchQ.rows.length, mothusi.id]
        );
        console.log(`\n✓ Updated Mothusi's rating to ${avgRating.toFixed(2)} with ${mismatchQ.rows.length} reviews`);
      }
    }

    console.log('\n=== Done ===');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
})();
