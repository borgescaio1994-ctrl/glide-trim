-- Fix phone_verifications table schema to match code expectations
-- This migration ensures the table has all required fields for proper verification flow

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add code column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'phone_verifications' 
        AND column_name = 'code'
    ) THEN
        ALTER TABLE phone_verifications ADD COLUMN code TEXT;
    END IF;

    -- Add used column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'phone_verifications' 
        AND column_name = 'used'
    ) THEN
        ALTER TABLE phone_verifications ADD COLUMN used BOOLEAN DEFAULT false;
    END IF;

    -- Add used_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'phone_verifications' 
        AND column_name = 'used_at'
    ) THEN
        ALTER TABLE phone_verifications ADD COLUMN used_at TIMESTAMPTZ;
    END IF;

    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'phone_verifications' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE phone_verifications ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Create proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone_code ON phone_verifications(phone_number, code);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_used_expires ON phone_verifications(used, expires_at);

-- Add comment for documentation
COMMENT ON TABLE phone_verifications IS 'Stores WhatsApp verification codes with proper tracking';
COMMENT ON COLUMN phone_verifications.code IS '6-digit verification code sent via WhatsApp';
COMMENT ON COLUMN phone_verifications.used IS 'Flag to prevent code reuse';
COMMENT ON COLUMN phone_verifications.used_at IS 'Timestamp when code was marked as used';
