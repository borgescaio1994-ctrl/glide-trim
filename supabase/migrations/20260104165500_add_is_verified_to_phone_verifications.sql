-- Add is_verified column to phone_verifications table
ALTER TABLE phone_verifications ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;

-- Update existing verified records
UPDATE phone_verifications SET is_verified = TRUE WHERE verified_at IS NOT NULL;

-- Rename token to verification_code for clarity
ALTER TABLE phone_verifications RENAME COLUMN token TO verification_code;