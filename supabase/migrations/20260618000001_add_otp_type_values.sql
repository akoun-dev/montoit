-- Migration: Add missing otp_type enum values
-- otp_type enum was initially missing EMAIL_CHANGE, PHONE_CHANGE, and PHONE_VERIFY
-- The application code already uses these values, causing insert failures

alter type otp_type add value if not exists 'EMAIL_CHANGE';
alter type otp_type add value if not exists 'PHONE_CHANGE';
alter type otp_type add value if not exists 'PHONE_VERIFY';
