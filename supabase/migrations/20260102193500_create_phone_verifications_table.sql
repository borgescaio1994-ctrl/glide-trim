-- Create phone_verifications table for WhatsApp verification
CREATE TABLE phone_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ
);

-- Index for faster lookups
CREATE INDEX idx_phone_verifications_phone_token ON phone_verifications(phone_number, token);
CREATE INDEX idx_phone_verifications_expires ON phone_verifications(expires_at);