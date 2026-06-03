# Audit des profils — Montoit

Plateforme de gestion locative avec **5 rôles utilisateur** :

| Rôle | Dashboard | Accès API |
|---|---|---|
| [Locataire](./01-locataire.md) | 20 sections | `/api/locataire/*`, `/api/rental-file/*`, + endpoints généraux |
| [Propriétaire](./02-proprietaire.md) | 19 sections | `/api/owner/*`, `/api/owner-file/*`, + endpoints généraux |
| [Tiers de Confiance](./03-tiers-de-confiance.md) | 24 sections | `/api/tc/*` (agents, missions exclusifs) |
| [Agence](./04-agence.md) | 16 sections | `/api/agence/*`, + endpoints généraux |
| [Admin](./05-admin.md) | 15 sections | `/api/admin/*`, + partagé TC |

## Flux principaux

```
Locataire ──> Dossier locatif ──> Candidature ──> TC (validation)
                                                      │
Propriétaire ──> Dossier propriétaire ──> TC (validation)
                                                      │
                  ┌───────────────────────────────────┘
                  ▼
            Location signée ──> Paiements ──> Maintenance
```

## Rôles basculables

Les utilisateurs peuvent avoir **plusieurs rôles** (`LOCATAIRE`, `PROPRIETAIRE`, `AGENCE`) et basculer via l'interface. Les rôles `TIERS_CONFIANCE` et `ADMIN` sont exclusifs et non-basculables.

## Base de données

- **59 migrations** dans `supabase/migrations/`
- **Type enum** `user_role` dans `20260518131900_create_enums.sql`
- **Table `users`** avec colonnes `role` (permanent) et `active_role` (courant)
