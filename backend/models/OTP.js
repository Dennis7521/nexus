const { query } = require('../config/database');
const crypto = require('crypto');

class OTP {
  // Generate a 6-digit OTP
  static generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Create and store OTP for email verification
  static async createEmailOTP(email, purpose = 'email_verification') {
    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    
    // Delete any existing OTPs for this email and purpose
    await query(
      'DELETE FROM otps WHERE email = $1 AND purpose = $2',
      [email, purpose]
    );

    // Insert new OTP
    const result = await query(
      `INSERT INTO otps (email, otp_code, purpose, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, otp_code, purpose, expires_at, created_at`,
      [email, otp, purpose, expiresAt]
    );

    return result.rows[0];
  }

  // Verify OTP
  static async verifyOTP(email, otpCode, purpose = 'email_verification') {
    const result = await query(
      `SELECT * FROM otps 
       WHERE email = $1 AND otp_code = $2 AND purpose = $3 
         AND expires_at > NOW() AND is_used = false`,
      [email, otpCode, purpose]
    );

    if (result.rows.length === 0) {
      return { valid: false, message: 'Invalid or expired OTP' };
    }

    const otpRecord = result.rows[0];

    // Mark OTP as used
    await query(
      'UPDATE otps SET is_used = true, used_at = NOW() WHERE id = $1',
      [otpRecord.id]
    );

    return { valid: true, otpRecord };
  }

  // Clean up expired OTPs (can be called periodically)
  static async cleanupExpiredOTPs() {
    const result = await query(
      'DELETE FROM otps WHERE expires_at < NOW() OR (is_used = true AND used_at < NOW() - INTERVAL \'1 day\')',
      []
    );

    return result.rowCount;
  }

  // Check if email has pending OTP
  static async hasPendingOTP(email, purpose = 'email_verification') {
    const result = await query(
      `SELECT id FROM otps 
       WHERE email = $1 AND purpose = $2 AND expires_at > NOW() AND is_used = false`,
      [email, purpose]
    );

    return result.rows.length > 0;
  }

  // Get OTP attempts count for rate limiting
  static async getOTPAttempts(email, timeWindow = 60) {
    const result = await query(
      `SELECT COUNT(*) as attempt_count
       FROM otps 
       WHERE email = $1 AND created_at > NOW() - INTERVAL '${timeWindow} minutes'`,
      [email]
    );

    return parseInt(result.rows[0].attempt_count);
  }
}

module.exports = OTP;
