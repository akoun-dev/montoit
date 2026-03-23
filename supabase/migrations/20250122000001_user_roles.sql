-- Table pour gérer les rôles multiples d'un utilisateur
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('tenant', 'owner', 'agency', 'admin', 'trust_agent')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_is_active ON user_roles(is_active);

-- Fonction pour mettre à jour le champ updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour automatiquement updated_at
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Commentaires
COMMENT ON TABLE user_roles IS 'Rôles multiples d''un utilisateur (permet à un compte d''avoir plusieurs rôles)';
COMMENT ON COLUMN user_roles.is_active IS 'Indique si ce rôle est actif pour l''utilisateur';
COMMENT ON COLUMN user_roles.role IS 'Rôle de l''utilisateur: tenant, owner, agency, admin, moderator, trust_agent';

-- Vue pour les utilisateurs avec leurs rôles actifs
CREATE OR REPLACE VIEW users_with_active_roles AS
SELECT
  u.id,
  u.email,
  ARRAY_AGG(ur.role) FILTER (WHERE ur.is_active = true) as active_roles,
  MAX(p.full_name) as full_name,
  MAX(p.avatar_url) as avatar_url
FROM auth.users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN profiles p ON p.id = u.id
GROUP BY u.id;
