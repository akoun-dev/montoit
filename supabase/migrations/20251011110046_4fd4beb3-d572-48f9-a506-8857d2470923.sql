-- =====================================================
-- US-003: Property Alerts System - Database Schema
-- =====================================================

-- 1. Create property_alerts table
CREATE TABLE IF NOT EXISTS public.property_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('new_similar', 'price_drop', 'status_change')),
  
  -- Search criteria for "new_similar" alerts
  search_criteria JSONB DEFAULT '{}'::jsonb,
  
  -- Notification configuration
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  
  -- Metadata
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_property_alerts_user_active 
  ON public.property_alerts(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_property_alerts_last_triggered 
  ON public.property_alerts(last_triggered_at);
CREATE INDEX IF NOT EXISTS idx_property_alerts_type 
  ON public.property_alerts(alert_type) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.property_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own alerts"
  ON public.property_alerts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_property_alerts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_property_alerts_updated_at
  BEFORE UPDATE ON public.property_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_property_alerts_updated_at();

-- =====================================================
-- 2. Create alert_history table
CREATE TABLE IF NOT EXISTS public.alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES public.property_alerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  
  alert_type TEXT NOT NULL,
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('email', 'push', 'in_app')),
  
  -- Alert details
  alert_data JSONB DEFAULT '{}'::jsonb,
  
  -- Delivery status
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivery_status TEXT DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'failed', 'bounced')),
  error_message TEXT,
  
  -- User engagement tracking
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_alert_history_user_date 
  ON public.alert_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_history_property 
  ON public.alert_history(property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_history_alert 
  ON public.alert_history(alert_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_history_engagement 
  ON public.alert_history(opened_at, clicked_at) WHERE opened_at IS NOT NULL OR clicked_at IS NOT NULL;

-- Enable RLS
ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own alert history"
  ON public.alert_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert alert history"
  ON public.alert_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update alert history"
  ON public.alert_history
  FOR UPDATE
  TO authenticated
  USING (true);

-- =====================================================
-- 3. Add property_alerts category to notification_preferences
-- Insert default preferences for existing users
INSERT INTO public.notification_preferences (user_id, category, enabled, email_enabled, push_enabled)
SELECT DISTINCT 
  p.id as user_id,
  'property_alerts' as category,
  true as enabled,
  true as email_enabled,
  true as push_enabled
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_preferences np 
  WHERE np.user_id = p.id AND np.category = 'property_alerts'
);

-- Add trigger to create property_alerts preferences for new users
CREATE OR REPLACE FUNCTION public.create_property_alerts_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id, category, enabled, email_enabled, push_enabled)
  VALUES (NEW.id, 'property_alerts', true, true, true)
  ON CONFLICT (user_id, category) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS create_property_alerts_preferences_trigger ON public.profiles;
CREATE TRIGGER create_property_alerts_preferences_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_property_alerts_preferences();

-- =====================================================
-- 4. Create analytics view for monitoring
CREATE OR REPLACE VIEW public.property_alerts_analytics AS
SELECT 
  date_trunc('day', sent_at) as date,
  alert_type,
  delivery_method,
  delivery_status,
  COUNT(*) as total_sent,
  COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as opened_count,
  COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as clicked_count,
  ROUND(
    COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 
    2
  ) as open_rate,
  ROUND(
    COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 
    2
  ) as click_rate
FROM public.alert_history
GROUP BY date, alert_type, delivery_method, delivery_status
ORDER BY date DESC;