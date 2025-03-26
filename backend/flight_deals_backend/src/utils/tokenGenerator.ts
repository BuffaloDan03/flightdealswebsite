import crypto from 'crypto';

/**
 * Generate a random verification token for email verification
 * @returns Random token string
 */
export const generateVerificationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Generate a random reset token for password reset
 * @returns Random token string
 */
export const generateResetToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};
