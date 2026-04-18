const { Resend } = require('resend');
require('dotenv').config();

class EmailService {
  constructor() {
    // Initialize Resend with API key
    if (!process.env.RESEND_API_KEY) {
      console.error('⚠️  RESEND_API_KEY not found in environment variables');
      console.error('⚠️  Email service will not work. Please add RESEND_API_KEY to .env file');
    }
    
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'NEXUS <onboarding@resend.dev>';
    
    console.log('✅ Resend email service initialized');
  }

  // Send OTP email
  async sendOTPEmail(recipientEmail, otpCode, purpose = 'email_verification') {
    const subject = this.getEmailSubject(purpose);
    const htmlContent = this.getEmailTemplate(otpCode, purpose);

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: recipientEmail,
        subject: subject,
        html: htmlContent
      });

      if (error) {
        console.error('❌ Resend API error:', error);
        return { 
          success: false, 
          error: error.message || 'Failed to send email'
        };
      }

      console.log('✅ OTP email sent successfully:', data.id);
      return { 
        success: true, 
        messageId: data.id 
      };
      
    } catch (error) {
      console.error('❌ Failed to send OTP email:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to send email'
      };
    }
  }

  // Get email subject based on purpose
  getEmailSubject(purpose) {
    switch (purpose) {
      case 'email_verification':
        return 'NEXUS - Verify Your Email Address';
      case 'password_reset':
        return 'NEXUS - Password Reset Code';
      case 'login_verification':
        return 'NEXUS - Login Verification Code';
      default:
        return 'NEXUS - Verification Code';
    }
  }

  // Get email template
  getEmailTemplate(otpCode, purpose) {
    const purposeText = this.getPurposeText(purpose);
    
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>NEXUS Verification Code</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #0D3B22 0%, #165a3a 100%); padding: 40px 30px; text-align: center;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">🎓 NEXUS</h1>
                                <p style="margin: 10px 0 0 0; color: #F0FBF5; font-size: 16px;">University Skill Exchange Platform</p>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                <h2 style="margin: 0 0 20px 0; color: #1A1A2E; font-size: 24px; font-weight: 600;">Verification Required</h2>
                                <p style="margin: 0 0 20px 0; color: #4A5568; font-size: 16px; line-height: 1.6;">Hello,</p>
                                <p style="margin: 0 0 30px 0; color: #4A5568; font-size: 16px; line-height: 1.6;">${purposeText}</p>
                                
                                <!-- OTP Code Card -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                    <tr>
                                        <td style="background: linear-gradient(135deg, #0D3B22 0%, #165a3a 100%); border-radius: 16px; padding: 32px 24px; text-align: center;">
                                            <p style="margin: 0 0 16px 0; color: rgba(255,255,255,0.7); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 3px;">Your Reset Code</p>
                                            <p style="margin: 0 0 16px 0; color: #ffffff; font-size: 48px; font-weight: 700; letter-spacing: 12px; font-family: 'Courier New', Courier, monospace;">${otpCode}</p>
                                            <p style="margin: 0; color: rgba(255,255,255,0.6); font-size: 12px;">Valid for 10 minutes &nbsp;·&nbsp; Do not share this code</p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Security Notice -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFF3CD; border: 2px solid #FFE69C; border-radius: 8px; margin: 30px 0;">
                                    <tr>
                                        <td style="padding: 20px;">
                                            <p style="margin: 0 0 10px 0; color: #856404; font-size: 16px; font-weight: 600;">⚠️ Security Notice:</p>
                                            <ul style="margin: 0; padding-left: 20px; color: #856404; font-size: 14px; line-height: 1.8;">
                                                <li>This code expires in <strong>10 minutes</strong></li>
                                                <li>Never share this code with anyone</li>
                                                <li>NEXUS staff will never ask for this code</li>
                                                <li>If you didn't request this, please ignore this email</li>
                                            </ul>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style="margin: 30px 0 0 0; color: #4A5568; font-size: 14px; line-height: 1.6;">If you're having trouble or didn't request this code, please contact our support team.</p>
                                
                                <p style="margin: 30px 0 0 0; color: #4A5568; font-size: 16px; line-height: 1.6;">
                                    Best regards,<br>
                                    <strong>The NEXUS Team</strong>
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #F7FAFC; padding: 30px; text-align: center; border-top: 1px solid #E2E8F0;">
                                <p style="margin: 0; color: #718096; font-size: 12px; line-height: 1.6;">
                                    This is an automated message from NEXUS Platform.<br>
                                    Please do not reply to this email.
                                </p>
                                <p style="margin: 15px 0 0 0; color: #A0AEC0; font-size: 11px;">
                                    © ${new Date().getFullYear()} NEXUS Platform. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
  }

  // Get purpose-specific text
  getPurposeText(purpose) {
    switch (purpose) {
      case 'email_verification':
        return 'Please use the following verification code to complete your NEXUS account registration:';
      case 'password_reset':
        return 'Please use the following code to reset your NEXUS account password:';
      case 'login_verification':
        return 'Please use the following code to complete your login to NEXUS:';
      default:
        return 'Please use the following verification code:';
    }
  }

  // Send password reset email with temporary password
  async sendPasswordResetEmail(recipientEmail, userName, temporaryPassword) {
    const subject = 'NEXUS - Your Password Has Been Reset';
    const htmlContent = this.getPasswordResetTemplate(userName, temporaryPassword);

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: recipientEmail,
        subject: subject,
        html: htmlContent
      });

      if (error) {
        console.error('❌ Resend API error:', error);
        return { 
          success: false, 
          error: error.message || 'Failed to send email'
        };
      }

      console.log('✅ Password reset email sent successfully:', data.id);
      return { 
        success: true, 
        messageId: data.id 
      };
      
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to send email'
      };
    }
  }

  // Get password reset email template
  getPasswordResetTemplate(userName, temporaryPassword) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - NEXUS</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                
                <!-- Header with gradient -->
                <tr>
                  <td style="background: linear-gradient(135deg, #0D3B22 0%, #165a3a 100%); padding: 40px 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                      NEXUS
                    </h1>
                    <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
                      Skill Exchange Platform
                    </p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 16px; color: #1A1A2E; font-size: 24px; font-weight: 600;">
                      Password Reset Approved
                    </h2>
                    
                    <p style="margin: 0 0 24px; color: #4A5568; font-size: 16px; line-height: 1.6;">
                      Hello ${userName},
                    </p>

                    <p style="margin: 0 0 24px; color: #4A5568; font-size: 16px; line-height: 1.6;">
                      Your password reset request has been approved by an administrator. Below is your temporary password:
                    </p>

                    <!-- Temporary Password Box -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 24px;">
                      <tr>
                        <td style="background-color: #F0FBF5; border: 2px solid #0D3B22; border-radius: 12px; padding: 24px; text-align: center;">
                          <p style="margin: 0 0 8px; color: #4A5568; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">
                            Temporary Password
                          </p>
                          <p style="margin: 0; color: #0D3B22; font-size: 32px; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 4px;">
                            ${temporaryPassword}
                          </p>
                        </td>
                      </tr>
                    </table>

                    <div style="background-color: #FFF4E6; border-left: 4px solid #F59E0B; padding: 16px; margin: 0 0 24px; border-radius: 8px;">
                      <p style="margin: 0 0 8px; color: #92400E; font-size: 14px; font-weight: 600;">
                        ⚠️ Important Security Notice
                      </p>
                      <ul style="margin: 0; padding-left: 20px; color: #92400E; font-size: 14px; line-height: 1.6;">
                        <li>You must change this password immediately upon logging in</li>
                        <li>This is a temporary password - do not share it with anyone</li>
                        <li>Choose a strong, unique password when changing it</li>
                        <li>If you did not request this reset, contact support immediately</li>
                      </ul>
                    </div>

                    <p style="margin: 0 0 24px; color: #4A5568; font-size: 16px; line-height: 1.6;">
                      To log in and change your password:
                    </p>

                    <ol style="margin: 0 0 24px; padding-left: 20px; color: #4A5568; font-size: 16px; line-height: 1.8;">
                      <li>Go to the NEXUS login page</li>
                      <li>Enter your email and the temporary password above</li>
                      <li>You will be prompted to create a new password</li>
                      <li>Choose a strong password with at least 8 characters</li>
                    </ol>

                    <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.6;">
                      If you have any questions or concerns, please contact the NEXUS support team.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #F7FAFC; padding: 24px 40px; text-align: center; border-top: 1px solid #E2E8F0;">
                    <p style="margin: 0 0 8px; color: #718096; font-size: 12px;">
                      This email was sent by NEXUS - University of Botswana Skill Exchange Platform
                    </p>
                    <p style="margin: 0; color: #A0AEC0; font-size: 12px;">
                      © ${new Date().getFullYear()} NEXUS. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  // Send credit purchase receipt email
  async sendPurchaseReceiptEmail(recipientEmail, userName, creditsPurchased, amountPaid, transactionId) {
    const subject = 'NEXUS — Credit Purchase Receipt';
    const htmlContent = this.getPurchaseReceiptTemplate(userName, creditsPurchased, amountPaid, transactionId);

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: recipientEmail,
        subject,
        html: htmlContent
      });

      if (error) {
        console.error('❌ Resend API error (receipt):', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Purchase receipt email sent:', data.id);
      return { success: true, messageId: data.id };
    } catch (error) {
      console.error('❌ Failed to send purchase receipt email:', error);
      return { success: false, error: error.message };
    }
  }

  // Purchase receipt HTML template
  getPurchaseReceiptTemplate(userName, creditsPurchased, amountPaid, transactionId) {
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>NEXUS Credit Purchase Receipt</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #0D3B22 0%, #165a3a 100%); padding: 40px 40px 30px; text-align: center;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">NEXUS</h1>
                                <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Skill Exchange Platform</p>
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="margin: 0 0 16px; color: #1A1A2E; font-size: 24px; font-weight: 600;">Purchase Receipt</h2>
                                <p style="margin: 0 0 24px; color: #4A5568; font-size: 16px; line-height: 1.6;">Hello ${userName},</p>
                                <p style="margin: 0 0 30px; color: #4A5568; font-size: 16px; line-height: 1.6;">
                                    Your credit purchase was successful! The credits have been added to your NEXUS account balance.
                                </p>

                                <!-- Summary Box -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F0FBF5; border: 2px solid #0D3B22; border-radius: 12px; margin: 0 0 30px;">
                                    <tr>
                                        <td style="padding: 30px;">
                                            <p style="margin: 0 0 6px; color: #4A5568; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Credits Purchased</p>
                                            <p style="margin: 0 0 20px; color: #0D3B22; font-size: 40px; font-weight: 700;">${creditsPurchased} credits</p>
                                            <table width="100%" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td style="color: #4A5568; font-size: 14px; padding: 6px 0; border-top: 1px solid #C6E8D5;">Amount Paid</td>
                                                    <td align="right" style="color: #1A1A2E; font-size: 14px; font-weight: 600; padding: 6px 0; border-top: 1px solid #C6E8D5;">P${Number(amountPaid).toFixed(2)} BWP</td>
                                                </tr>
                                                <tr>
                                                    <td style="color: #4A5568; font-size: 14px; padding: 6px 0;">Date</td>
                                                    <td align="right" style="color: #1A1A2E; font-size: 14px; font-weight: 600; padding: 6px 0;">${date}</td>
                                                </tr>
                                                <tr>
                                                    <td style="color: #4A5568; font-size: 14px; padding: 6px 0;">Transaction ID</td>
                                                    <td align="right" style="color: #1A1A2E; font-size: 12px; font-weight: 600; padding: 6px 0; font-family: monospace;">${transactionId ? transactionId.slice(0, 24) + '...' : 'N/A'}</td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>

                                <p style="margin: 0 0 24px; color: #4A5568; font-size: 14px; line-height: 1.6;">
                                    Your purchased credits are functionally identical to earned credits. Use them to request skill exchanges with other students on the platform.
                                </p>

                                <div style="background-color: #FFF4E6; border-left: 4px solid #F59E0B; padding: 16px; margin: 0 0 24px; border-radius: 8px;">
                                    <p style="margin: 0; color: #92400E; font-size: 13px; line-height: 1.6;">
                                        ⚠️ <strong>No Refunds:</strong> Credit purchases are final and non-refundable. If you have any concerns, please contact NEXUS support.
                                    </p>
                                </div>

                                <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.6;">
                                    Best regards,<br><strong>The NEXUS Team</strong>
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #F7FAFC; padding: 24px 40px; text-align: center; border-top: 1px solid #E2E8F0;">
                                <p style="margin: 0 0 8px; color: #718096; font-size: 12px;">This is an automated receipt from NEXUS — University of Botswana Skill Exchange Platform</p>
                                <p style="margin: 0; color: #A0AEC0; font-size: 11px;">© ${new Date().getFullYear()} NEXUS Platform. All rights reserved.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
  }

  // Send welcome deposit email after account creation
  async sendWelcomeDepositEmail(recipientEmail, userName, credits) {
    const subject = 'NEXUS — Welcome! Your Account is Ready';
    const htmlContent = this.getWelcomeDepositTemplate(userName, credits);

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: recipientEmail,
        subject,
        html: htmlContent
      });

      if (error) {
        console.error('❌ Resend API error (welcome deposit):', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Welcome deposit email sent:', data.id);
      return { success: true, messageId: data.id };
    } catch (error) {
      console.error('❌ Failed to send welcome deposit email:', error);
      return { success: false, error: error.message };
    }
  }

  // Welcome deposit email HTML template
  getWelcomeDepositTemplate(userName, credits) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to NEXUS!</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #0D3B22 0%, #165a3a 100%); padding: 40px 40px 30px; text-align: center;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">🎓 NEXUS</h1>
                                <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">University Skill Exchange Platform</p>
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="margin: 0 0 16px; color: #1A1A2E; font-size: 24px; font-weight: 600;">Welcome, ${userName}!</h2>
                                <p style="margin: 0 0 24px; color: #4A5568; font-size: 16px; line-height: 1.6;">
                                    Your NEXUS account has been successfully created and verified. You're now ready to start exchanging skills with fellow students at the University of Botswana.
                                </p>

                                <!-- Welcome Deposit Box -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #F0FBF5 0%, #E0F5E9 100%); border: 2px solid #0D3B22; border-radius: 12px; margin: 0 0 30px;">
                                    <tr>
                                        <td style="padding: 30px; text-align: center;">
                                            <p style="margin: 0 0 8px; color: #0D3B22; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Welcome Deposit</p>
                                            <p style="margin: 0 0 12px; color: #0D3B22; font-size: 48px; font-weight: 700;">${credits} Credits</p>
                                            <p style="margin: 0; color: #4A5568; font-size: 14px; line-height: 1.6;">
                                                Have been added to your account to get you started!
                                            </p>
                                        </td>
                                    </tr>
                                </table>

                                <h3 style="margin: 0 0 16px; color: #1A1A2E; font-size: 18px; font-weight: 600;">What You Can Do:</h3>
                                <ul style="margin: 0 0 24px; padding-left: 20px; color: #4A5568; font-size: 15px; line-height: 1.8;">
                                    <li><strong>Browse skills</strong> offered by other students</li>
                                    <li><strong>Request exchanges</strong> to learn new skills</li>
                                    <li><strong>Offer your own skills</strong> and earn credits</li>
                                    <li><strong>Build your profile</strong> with skills you possess and want to learn</li>
                                </ul>

                                <div style="background-color: #F0FBF5; border-left: 4px solid #0D3B22; padding: 16px; margin: 0 0 24px; border-radius: 8px;">
                                    <p style="margin: 0; color: #0D3B22; font-size: 14px; line-height: 1.6;">
                                        <strong>💡 Tip:</strong> Credits are our platform's currency. You earn them by teaching others and spend them to learn from peers. Each credit represents approximately one hour of skill exchange time.
                                    </p>
                                </div>

                                <p style="margin: 0 0 24px; color: #4A5568; font-size: 14px; line-height: 1.6;">
                                    We're excited to have you join our community of learners and teachers. Start exploring today!
                                </p>

                                <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.6;">
                                    Best regards,<br><strong>The NEXUS Team</strong>
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #F7FAFC; padding: 24px 40px; text-align: center; border-top: 1px solid #E2E8F0;">
                                <p style="margin: 0 0 8px; color: #718096; font-size: 12px;">This is an automated message from NEXUS — University of Botswana Skill Exchange Platform</p>
                                <p style="margin: 0; color: #A0AEC0; font-size: 11px;">© ${new Date().getFullYear()} NEXUS Platform. All rights reserved.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
  }

  // Test email service (optional - for debugging)
  async testConnection() {
    try {
      // Resend doesn't have a verify method, but we can check if API key exists
      if (!process.env.RESEND_API_KEY) {
        console.error('❌ RESEND_API_KEY not configured');
        return false;
      }
      console.log('✅ Resend email service is configured');
      return true;
    } catch (error) {
      console.error('❌ Email service configuration error:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
