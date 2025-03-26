import nodemailer from 'nodemailer';
import config from '../../config';
import { logger } from '../../utils/logger';

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465, // true for 465, false for other ports
  auth: {
    user: config.email.user,
    pass: config.email.password,
  },
});

/**
 * Send verification email to user
 * @param to Recipient email address
 * @param token Verification token
 */
export const sendVerificationEmail = async (to: string, token: string): Promise<void> => {
  try {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${token}`;
    
    const mailOptions = {
      from: config.email.from,
      to,
      subject: 'Verify Your Email - SkyDeal Flight Deals',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to SkyDeal!</h2>
          <p>Thank you for signing up. Please verify your email address to get started.</p>
          <p>
            <a href="${verificationUrl}" style="display: inline-block; background-color: #4A90E2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
              Verify Email
            </a>
          </p>
          <p>If the button above doesn't work, you can also copy and paste the following link into your browser:</p>
          <p>${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't sign up for SkyDeal, you can safely ignore this email.</p>
          <p>Best regards,<br>The SkyDeal Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Verification email sent to ${to}`);
  } catch (error) {
    logger.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

/**
 * Send password reset email to user
 * @param to Recipient email address
 * @param token Reset token
 */
export const sendPasswordResetEmail = async (to: string, token: string): Promise<void> => {
  try {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${token}`;
    
    const mailOptions = {
      from: config.email.from,
      to,
      subject: 'Reset Your Password - SkyDeal Flight Deals',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reset Your Password</h2>
          <p>You requested a password reset for your SkyDeal account. Click the button below to set a new password:</p>
          <p>
            <a href="${resetUrl}" style="display: inline-block; background-color: #4A90E2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
              Reset Password
            </a>
          </p>
          <p>If the button above doesn't work, you can also copy and paste the following link into your browser:</p>
          <p>${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request a password reset, you can safely ignore this email.</p>
          <p>Best regards,<br>The SkyDeal Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Password reset email sent to ${to}`);
  } catch (error) {
    logger.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

/**
 * Send deal notification email to user
 * @param to Recipient email address
 * @param dealData Deal information
 */
export const sendDealNotificationEmail = async (to: string, dealData: any): Promise<void> => {
  try {
    const viewDealUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/deals/${dealData.id}`;
    
    const mailOptions = {
      from: config.email.from,
      to,
      subject: `Flight Deal Alert: ${dealData.origin} to ${dealData.destination} - ${dealData.discountPercentage}% Off!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Flight Deal Alert!</h2>
          <div style="background-color: #f8f8f8; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <div style="font-size: 24px; font-weight: bold; color: #4A90E2; margin-bottom: 10px;">
              ${dealData.origin} to ${dealData.destination}
            </div>
            <div style="font-size: 18px; margin-bottom: 10px;">
              <span style="text-decoration: line-through; color: #999;">$${dealData.regularPrice}</span>
              <span style="color: #e74c3c; font-weight: bold; margin-left: 10px;">$${dealData.price}</span>
              <span style="background-color: #e74c3c; color: white; padding: 3px 6px; border-radius: 4px; margin-left: 10px; font-size: 14px;">
                ${dealData.discountPercentage}% OFF
              </span>
            </div>
            <div style="margin-bottom: 10px;">
              <strong>Airline:</strong> ${dealData.airline}
            </div>
            <div style="margin-bottom: 10px;">
              <strong>Travel Dates:</strong> ${dealData.departureDate} - ${dealData.returnDate}
            </div>
            <div style="margin-bottom: 10px;">
              <strong>Expires:</strong> ${dealData.expiresAt}
            </div>
          </div>
          <p>
            <a href="${viewDealUrl}" style="display: inline-block; background-color: #4A90E2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
              View Deal
            </a>
          </p>
          <p style="color: #999; font-size: 12px;">
            You're receiving this email because you subscribed to flight deal alerts from SkyDeal.
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/preferences">Manage your preferences</a> or
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/unsubscribe">unsubscribe</a>.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Deal notification email sent to ${to}`);
  } catch (error) {
    logger.error('Error sending deal notification email:', error);
    throw new Error('Failed to send deal notification email');
  }
};
