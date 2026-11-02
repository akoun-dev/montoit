-- visit_requests.assigned_agent_id was constrained to users(id), but the
-- agency dashboard has only ever assigned agency_agents records — a
-- standalone resource table with no platform account (the same model
-- chosen for the TC's verification_agents). Every assignment therefore
-- violated the FK and silently failed (agence/visits.tsx always showed a
-- generic "Erreur lors de l'assignation" toast). Repoint the FK at the
-- table actually being assigned from.

alter table visit_requests drop constraint if exists fk_visit_requests_assigned_agent;
alter table visit_requests add constraint fk_visit_requests_assigned_agent
  foreign key (assigned_agent_id) references agency_agents(id) on delete set null;

-- These policies assumed assigned_agent_id held an authenticated user's id;
-- agency_agents have no platform account/session, so the column can never
-- equal auth.uid() and the policies were dead weight.
drop policy if exists "visit_requests_select_assigned_agent" on visit_requests;
drop policy if exists "visit_requests_update_assigned_agent" on visit_requests;
