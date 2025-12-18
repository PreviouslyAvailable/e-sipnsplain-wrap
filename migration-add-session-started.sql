-- Migration: Add 'session_started' column to rooms table
-- Run this SQL in your Supabase SQL Editor

-- Add 'session_started' column to rooms table (defaults to false for existing rooms)
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS session_started BOOLEAN DEFAULT false;

-- Update existing rooms to be not started by default
UPDATE rooms SET session_started = false WHERE session_started IS NULL;

