-- Sip'n'Sleigh Quiz App - Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor to set up the database

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT,
  active_question_id UUID,
  timeline_position JSONB, -- { month: string, scrollPosition: number, activeMomentId: string | null }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mcq', 'text', 'scale')),
  prompt TEXT NOT NULL,
  options JSONB,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create responses table
CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create timeline_moments table
CREATE TABLE IF NOT EXISTS timeline_moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  photo_url TEXT NOT NULL, -- Supabase Storage path
  caption TEXT,
  question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create photos table (for timeline photo management)
CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  moment_id UUID REFERENCES timeline_moments(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  caption TEXT,
  date_taken TIMESTAMP WITH TIME ZONE,
  order_index INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
CREATE INDEX IF NOT EXISTS idx_questions_room_id ON questions(room_id);
CREATE INDEX IF NOT EXISTS idx_questions_order_index ON questions(room_id, order_index);
CREATE INDEX IF NOT EXISTS idx_responses_room_id ON responses(room_id);
CREATE INDEX IF NOT EXISTS idx_responses_question_id ON responses(question_id);
CREATE INDEX IF NOT EXISTS idx_responses_room_question ON responses(room_id, question_id);
CREATE INDEX IF NOT EXISTS idx_timeline_moments_room_id ON timeline_moments(room_id);
CREATE INDEX IF NOT EXISTS idx_timeline_moments_date ON timeline_moments(date);
CREATE INDEX IF NOT EXISTS idx_timeline_moments_order ON timeline_moments(room_id, order_index);
CREATE INDEX IF NOT EXISTS idx_photos_room_id ON photos(room_id);
CREATE INDEX IF NOT EXISTS idx_photos_date_taken ON photos(date_taken);
CREATE INDEX IF NOT EXISTS idx_photos_order_index ON photos(room_id, order_index);

-- Enable Row Level Security (RLS)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rooms - allow public read/write
CREATE POLICY "Allow public read access on rooms"
  ON rooms FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on rooms"
  ON rooms FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on rooms"
  ON rooms FOR UPDATE
  USING (true);

-- RLS Policies for questions - allow public read/write
CREATE POLICY "Allow public read access on questions"
  ON questions FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on questions"
  ON questions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on questions"
  ON questions FOR UPDATE
  USING (true);

-- RLS Policies for responses - allow public read/write
CREATE POLICY "Allow public read access on responses"
  ON responses FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on responses"
  ON responses FOR INSERT
  WITH CHECK (true);

-- RLS Policies for timeline_moments - allow public read/write
CREATE POLICY "Allow public read access on timeline_moments"
  ON timeline_moments FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on timeline_moments"
  ON timeline_moments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on timeline_moments"
  ON timeline_moments FOR UPDATE
  USING (true);

-- RLS Policies for photos - allow public read/write
CREATE POLICY "Allow public read access on photos"
  ON photos FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on photos"
  ON photos FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on photos"
  ON photos FOR UPDATE
  USING (true);

-- Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE questions;
ALTER PUBLICATION supabase_realtime ADD TABLE responses;
ALTER PUBLICATION supabase_realtime ADD TABLE timeline_moments;
ALTER PUBLICATION supabase_realtime ADD TABLE photos;

-- Supabase Storage Setup Instructions:
-- 1. Go to Storage in your Supabase dashboard
-- 2. Create a new bucket named "timeline-photos"
-- 3. Set bucket to public (or configure RLS policies for public read access)
-- 4. Enable file size limits and allowed MIME types as needed
-- 5. Photo URLs will be: https://[project-ref].supabase.co/storage/v1/object/public/timeline-photos/[file-path]

