-- ============================================================================
-- Reports Table: Centralized reporting system for all entities
-- ============================================================================
-- Author: MonToit Development Team
-- Created: 2026-03-28
-- Description: Unified system for users to report properties, users, messages,
--              reviews, and contracts. Includes moderation workflow.
-- ============================================================================

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Entity being reported
  report_type TEXT NOT NULL CHECK (report_type IN ('property', 'user', 'message', 'review', 'contract')),
  entity_id UUID NOT NULL,

  -- Report details
  reason TEXT NOT NULL CHECK (reason IN (
    -- Common reasons
    'fraud',
    'inappropriate',
    'spam',
    'duplicate',
    -- Property specific
    'fake_photos',
    'fake_price',
    'fake_listing',
    'scam',
    -- User specific
    'fake_profile',
    'harassment',
    'impersonation',
    -- Message specific
    'inappropriate_content',
    'phishing',
    'scam_attempt',
    -- Review specific
    'fake_review',
    'conflict_of_interest',
    'defamatory',
    -- Contract specific
    'terms_violation',
    'fake_contract'
  )),
  description TEXT,

  -- Moderation workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',        -- Awaiting moderation
    'under_review',   -- Being reviewed by moderator
    'resolved',       -- Issue resolved
    'dismissed',      -- Report dismissed as invalid
    'escalated'       -- Escalated to higher authority
  )),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Evidence and attachments
  evidence_urls JSONB DEFAULT '[]',

  -- Assignment
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  moderator_notes TEXT,
  resolution TEXT,

  -- Timestamps
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Fast lookup by entity
CREATE INDEX idx_reports_entity ON reports(report_type, entity_id);

-- Filter by status for moderation queue
CREATE INDEX idx_reports_status ON reports(status) WHERE status IN ('pending', 'under_review');

-- Filter by priority
CREATE INDEX idx_reports_priority ON reports(priority, created_at DESC) WHERE priority IN ('high', 'urgent');

-- User's reports
CREATE INDEX idx_reports_reporter ON reports(reporter_id, created_at DESC);

-- Assigned reports for moderators
CREATE INDEX idx_reports_assigned ON reports(assigned_to, status) WHERE assigned_to IS NOT NULL;

-- Recent reports for dashboard
CREATE INDEX idx_reports_created ON reports(created_at DESC);

-- Full-text search on description
CREATE INDEX idx_reports_description_fts ON reports USING gin(to_tsvector('french', description));

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_reports_updated_at();

-- Auto-set resolved_at when status changes to resolved
CREATE OR REPLACE FUNCTION set_report_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    NEW.resolved_at = NOW();
  ELSIF NEW.status != 'resolved' THEN
    NEW.resolved_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_report_resolved_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION set_report_resolved_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone can create a report
CREATE POLICY "Anyone can create reports"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Policy 2: Users can view their own reports
CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- Policy 3: Admins, moderators, and trust agents can view all reports
CREATE POLICY "Staff can view all reports"
  ON reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'moderator', 'trust_agent')
    )
  );

-- Policy 4: Users can update their own reports (add evidence, clarify)
CREATE POLICY "Users can update own reports"
  ON reports FOR UPDATE
  USING (
    auth.uid() = reporter_id
    AND (
      -- Allow updating if status is still pending
      (SELECT status FROM reports WHERE id = reports.id) = 'pending'
    )
  );

-- Policy 5: Staff can update all report fields
CREATE POLICY "Staff can update all reports"
  ON reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'moderator', 'trust_agent')
    )
  );

-- Policy 6: Users can delete their own pending reports
CREATE POLICY "Users can delete own pending reports"
  ON reports FOR DELETE
  USING (
    auth.uid() = reporter_id
    AND status = 'pending'
  );

-- Policy 7: Only admins can permanently delete reports
CREATE POLICY "Admins can delete any report"
  ON reports FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get report statistics for dashboard
CREATE OR REPLACE FUNCTION get_report_statistics()
RETURNS TABLE (
  total_reports BIGINT,
  pending_reports BIGINT,
  under_review_reports BIGINT,
  resolved_reports BIGINT,
  high_priority_reports BIGINT,
  urgent_reports BIGINT,
  reports_by_type JSONB,
  reports_by_reason JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'under_review')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'resolved')::BIGINT,
    COUNT(*) FILTER (WHERE priority = 'high' AND status IN ('pending', 'under_review'))::BIGINT,
    COUNT(*) FILTER (WHERE priority = 'urgent' AND status IN ('pending', 'under_review'))::BIGINT,
    (
      SELECT jsonb_object_agg(report_type, count)
      FROM (
        SELECT report_type, COUNT(*) as count
        FROM reports
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY report_type
      ) t
    ),
    (
      SELECT jsonb_object_agg(reason, count)
      FROM (
        SELECT reason, COUNT(*) as count
        FROM reports
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY reason
      ) t
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has already reported an entity
CREATE OR REPLACE FUNCTION has_reported(
  p_reporter_id UUID,
  p_report_type TEXT,
  p_entity_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM reports
    WHERE reporter_id = p_reporter_id
      AND report_type = p_report_type
      AND entity_id = p_entity_id
      AND status NOT IN ('dismissed')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get entity report count (for auto-escalation)
CREATE OR REPLACE FUNCTION get_entity_report_count(
  p_report_type TEXT,
  p_entity_id UUID,
  p_days_interval INTEGER DEFAULT 30
)
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM reports
    WHERE report_type = p_report_type
      AND entity_id = p_entity_id
      AND created_at > NOW() - (p_days_interval || ' days')::INTERVAL
      AND status NOT IN ('dismissed')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Active reports queue for moderators
CREATE OR REPLACE VIEW active_reports_queue AS
SELECT
  r.id,
  r.report_type,
  r.entity_id,
  r.reason,
  r.status,
  r.priority,
  r.created_at,
  r.reporter_id,
  p1.full_name as reporter_name,
  p1.user_type as reporter_type,
  r.assigned_to,
  p2.full_name as assigned_moderator_name,
  -- Entity details
  CASE
    WHEN r.report_type = 'property' THEN (
      SELECT title FROM properties WHERE id = r.entity_id
    )
    WHEN r.report_type = 'user' THEN (
      SELECT full_name FROM profiles WHERE id = r.entity_id
    )
    WHEN r.report_type = 'review' THEN (
      SELECT comment FROM reviews WHERE id = r.entity_id
    )
    ELSE NULL
  END as entity_title,
  -- Report count for this entity
  get_entity_report_count(r.report_type, r.entity_id) as entity_report_count
FROM reports r
LEFT JOIN profiles p1 ON r.reporter_id = p1.id
LEFT JOIN profiles p2 ON r.assigned_to = p2.id
WHERE r.status IN ('pending', 'under_review')
ORDER BY
  CASE r.priority
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    ELSE 4
  END,
  r.created_at ASC;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE reports IS 'Centralized reporting system for user-generated content moderation';
COMMENT ON COLUMN reports.report_type IS 'Type of entity being reported: property, user, message, review, contract';
COMMENT ON COLUMN reports.reason IS 'Categorized reason for the report (fraud, inappropriate, etc.)';
COMMENT ON COLUMN reports.status IS 'Current moderation status: pending, under_review, resolved, dismissed, escalated';
COMMENT ON COLUMN reports.priority IS 'Report urgency: low, medium, high, urgent';
COMMENT ON COLUMN reports.evidence_urls IS 'JSON array of URLs to supporting evidence/screenshots';
COMMENT ON COLUMN reports.assigned_to IS 'Moderator/admin assigned to handle this report';
COMMENT ON COLUMN reports.resolution IS 'Final resolution description when report is resolved';

COMMENT ON FUNCTION get_report_statistics() IS 'Returns aggregated statistics for moderation dashboard';
COMMENT ON FUNCTION has_reported(UUID, TEXT, UUID) IS 'Check if a user has already reported a specific entity';
COMMENT ON FUNCTION get_entity_report_count(TEXT, UUID, INTEGER) IS 'Get number of reports for an entity within time period';
COMMENT ON VIEW active_reports_queue IS 'Prioritized view of reports needing moderator attention';
