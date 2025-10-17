/*
  # Create Illustration Analytics System

  1. New Tables
    - `illustration_analytics`
      - `id` (uuid, primary key)
      - `illustration_key` (text, unique)
      - `view_count` (integer, default 0)
      - `download_count` (integer, default 0)
      - `last_viewed_at` (timestamptz)
      - `last_downloaded_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `illustration_activity_log`
      - `id` (uuid, primary key)
      - `illustration_key` (text)
      - `action_type` (text: 'view' or 'download')
      - `user_id` (uuid, nullable - for authenticated users)
      - `session_id` (text, nullable - for anonymous tracking)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Public can view analytics summaries
    - Anyone can track actions (for anonymous users)

  3. Functions
    - `track_illustration_view` - Increment view count
    - `track_illustration_download` - Increment download count
    - `get_popular_illustrations` - Get most viewed/downloaded
*/

-- Create illustration_analytics table
CREATE TABLE IF NOT EXISTS illustration_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  illustration_key text UNIQUE NOT NULL,
  view_count integer DEFAULT 0,
  download_count integer DEFAULT 0,
  last_viewed_at timestamptz,
  last_downloaded_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create illustration_activity_log table
CREATE TABLE IF NOT EXISTS illustration_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  illustration_key text NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('view', 'download')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_illustration_analytics_key ON illustration_analytics(illustration_key);
CREATE INDEX IF NOT EXISTS idx_illustration_activity_log_key ON illustration_activity_log(illustration_key);
CREATE INDEX IF NOT EXISTS idx_illustration_activity_log_action ON illustration_activity_log(action_type);
CREATE INDEX IF NOT EXISTS idx_illustration_activity_log_created ON illustration_activity_log(created_at DESC);

-- Enable RLS
ALTER TABLE illustration_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE illustration_activity_log ENABLE ROW LEVEL SECURITY;

-- Policies for illustration_analytics
CREATE POLICY "Anyone can view illustration analytics"
  ON illustration_analytics
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "System can insert analytics"
  ON illustration_analytics
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "System can update analytics"
  ON illustration_analytics
  FOR UPDATE
  TO public
  USING (true);

-- Policies for illustration_activity_log
CREATE POLICY "Anyone can insert activity logs"
  ON illustration_activity_log
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can view their own activity logs"
  ON illustration_activity_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to track illustration view
CREATE OR REPLACE FUNCTION track_illustration_view(p_illustration_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update analytics
  INSERT INTO illustration_analytics (illustration_key, view_count, last_viewed_at, updated_at)
  VALUES (p_illustration_key, 1, now(), now())
  ON CONFLICT (illustration_key)
  DO UPDATE SET
    view_count = illustration_analytics.view_count + 1,
    last_viewed_at = now(),
    updated_at = now();

  -- Log the activity
  INSERT INTO illustration_activity_log (
    illustration_key,
    action_type,
    user_id,
    created_at
  ) VALUES (
    p_illustration_key,
    'view',
    auth.uid(),
    now()
  );
END;
$$;

-- Function to track illustration download
CREATE OR REPLACE FUNCTION track_illustration_download(p_illustration_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update analytics
  INSERT INTO illustration_analytics (illustration_key, download_count, last_downloaded_at, updated_at)
  VALUES (p_illustration_key, 1, now(), now())
  ON CONFLICT (illustration_key)
  DO UPDATE SET
    download_count = illustration_analytics.download_count + 1,
    last_downloaded_at = now(),
    updated_at = now();

  -- Log the activity
  INSERT INTO illustration_activity_log (
    illustration_key,
    action_type,
    user_id,
    created_at
  ) VALUES (
    p_illustration_key,
    'download',
    auth.uid(),
    now()
  );
END;
$$;

-- Function to get popular illustrations
CREATE OR REPLACE FUNCTION get_popular_illustrations(
  p_limit integer DEFAULT 10,
  p_order_by text DEFAULT 'view_count'
)
RETURNS TABLE (
  illustration_key text,
  view_count integer,
  download_count integer,
  last_viewed_at timestamptz,
  last_downloaded_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ia.illustration_key,
    ia.view_count,
    ia.download_count,
    ia.last_viewed_at,
    ia.last_downloaded_at
  FROM illustration_analytics ia
  ORDER BY
    CASE
      WHEN p_order_by = 'view_count' THEN ia.view_count
      WHEN p_order_by = 'download_count' THEN ia.download_count
      ELSE ia.view_count
    END DESC
  LIMIT p_limit;
END;
$$;

-- Initialize analytics for all 10 illustrations
INSERT INTO illustration_analytics (illustration_key, view_count, download_count)
VALUES
  ('ivorian-family-house', 0, 0),
  ('apartment-visit', 0, 0),
  ('real-estate-agent', 0, 0),
  ('abidjan-neighborhood', 0, 0),
  ('modern-living-room', 0, 0),
  ('abidjan-skyline', 0, 0),
  ('key-handover', 0, 0),
  ('family-moving', 0, 0),
  ('co-ownership-meeting', 0, 0),
  ('certification-ansut-illustration', 0, 0)
ON CONFLICT (illustration_key) DO NOTHING;