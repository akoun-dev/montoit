/*
  Migration: Add trust_agent to user_role enum

  This migration adds the trust_agent role to the user_role enum
  that is used by the user_roles table.
*/

-- Add trust_agent to the user_role enum
alter type user_role add value 'trust_agent';
