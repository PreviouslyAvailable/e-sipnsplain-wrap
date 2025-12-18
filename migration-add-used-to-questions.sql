-- Migration: Add 'used' column to questions table and DELETE policy for responses
-- Run this SQL in your Supabase SQL Editor

-- Add 'used' column to questions table (defaults to false for existing questions)
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS used BOOLEAN DEFAULT false;

-- Update existing questions to be unused by default
UPDATE questions SET used = false WHERE used IS NULL;

-- Add DELETE policy for responses table (needed for reset functionality)
CREATE POLICY IF NOT EXISTS "Allow public delete on responses"
  ON responses FOR DELETE
  USING (true);

