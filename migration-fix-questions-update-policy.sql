-- Migration: Fix UPDATE policy for questions table
-- Run this SQL in your Supabase SQL Editor

-- Drop the existing policy if it exists
DROP POLICY IF EXISTS "Allow public update on questions" ON questions;

-- Recreate the policy with both USING and WITH CHECK clauses
CREATE POLICY "Allow public update on questions"
  ON questions FOR UPDATE
  USING (true)
  WITH CHECK (true);

