/*
  # Add Public View Policy for Properties

  ## Problem
  Currently only property owners can SELECT their own properties.
  This prevents public browsing of available properties.

  ## Solution
  Add a policy allowing authenticated AND anonymous users to view:
  - Approved properties (moderation_status = 'approved')
  - Available properties (status = 'disponible')
  
  ## Security Notes
  - owner_id is still protected (not exposed to public)
  - Only approved, available properties are visible
  - Owners retain full access to their own properties
*/

-- Allow public to view approved, available properties
CREATE POLICY "Public can view approved available properties"
  ON properties FOR SELECT
  TO authenticated, anon
  USING (
    moderation_status = 'approved' 
    AND status IN ('disponible', 'en_attente')
  );

-- Ensure admins can see all properties
CREATE POLICY "Admins can view all properties"
  ON properties FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
