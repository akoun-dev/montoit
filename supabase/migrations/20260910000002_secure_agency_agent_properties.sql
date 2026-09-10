-- The insert policy on agency_agent_properties only checked that the agent
-- belongs to the agency, not that the agency actually holds an active
-- mandate on the property being assigned. An agency could therefore assign
-- one of its agents to a property it has no management rights over.
-- Require an ACTIVE mandate between the agency and the property for new
-- assignments.

drop policy if exists "agency_agent_properties_insert_agency" on agency_agent_properties;
create policy "agency_agent_properties_insert_agency"
  on agency_agent_properties for insert
  to authenticated
  with check (
    exists (
      select 1 from agency_agents
      where id = agent_id and agency_id = (select auth.uid()::text)
    )
    and exists (
      select 1 from mandats
      where property_id = agency_agent_properties.property_id
        and agency_id = (select auth.uid()::text)
        and status = 'ACTIVE'
    )
  );
