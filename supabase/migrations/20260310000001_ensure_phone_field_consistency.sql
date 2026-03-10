-- Ensure phone field consistency across profiles table
-- This migration ensures backward compatibility and proper field naming

-- Add phone column if it doesn't exist (for backward compatibility)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'phone'
    ) THEN
        ALTER TABLE profiles ADD COLUMN phone TEXT;
    END IF;
END $$;

-- Create a trigger to sync phone_number to phone for consistency
CREATE OR REPLACE FUNCTION sync_phone_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- If phone_number is updated, also update phone
    IF NEW.phone_number IS DISTINCT FROM OLD.phone_number THEN
        NEW.phone := NEW.phone_number;
    END IF;
    
    -- If phone is updated, also update phone_number
    IF NEW.phone IS DISTINCT FROM OLD.phone THEN
        NEW.phone_number := NEW.phone;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_sync_phone_fields ON profiles;

-- Create trigger to sync fields
CREATE TRIGGER trigger_sync_phone_fields
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_phone_fields();

-- Add comments for documentation
COMMENT ON COLUMN profiles.phone IS 'Primary phone field - synced with phone_number';
COMMENT ON COLUMN profiles.phone_number IS 'Legacy phone field - synced with phone';
