-- Add FCM token column to profiles table for push notifications
ALTER TABLE public.profiles ADD COLUMN fcm_token TEXT;