-- Enable Realtime publication for agency-related tables
-- These tables are used by the agency dashboard views

alter publication supabase_realtime add table agency_agents;
alter publication supabase_realtime add table agency_agent_properties;
alter publication supabase_realtime add table mandats;