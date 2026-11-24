-- ============================================
-- Caribean Homes Manager - Airbnb iCal sync
-- ============================================
-- Run this once in your Supabase SQL Editor
-- https://supabase.com/dashboard/project/_/sql/new
-- ============================================

ALTER TABLE apartments ADD COLUMN IF NOT EXISTS ical_url TEXT;

COMMENT ON COLUMN apartments.ical_url IS 'Airbnb iCal (ICS) feed URL used to sync reservations into the calendar.';
