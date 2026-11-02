# Administrateur

## 1. Nom et rôle

L'administrateur supervise la plateforme, les comptes, la modération, les tiers de confiance, les signalements, les litiges, la sécurité et la configuration. Le rôle est déclaré dans `src/lib/auth-store.ts`; son périmètre est rendu par `src/components/dashboard/admin/*`.

**Hypothèses et limites :** l'existence d'un écran admin ne garantit ni la persistance de ses actions ni un contrôle de rôle suffisant côté serveur. Chaque constat ci-dessous doit être lu avec sa preuve de code.

## 2. Fonctionnalités existantes

| Fonctionnalité | Preuve UI | Preuve backend/données | État du flux | Observations |
|---|---|---|---|---|
| Vue globale | `admin/overview.tsx` | `dashboard/admin/route.ts` | Existante à confirmer | Agrégats de supervision. |
| Gestion utilisateurs | `admin/users.tsx` | `admin/users/route.ts`, `users` | Existante | Consultation et actions d'administration. |
| Gestion tiers de confiance | `admin/tc-management.tsx`, `trust-agents.tsx` | routes admin/TC, users/certifications | Existante | Création, supervision et statut des TC. |
| Création/révocation opérationnelle des TC | `admin/tc-management.tsx` | aucune mutation API clairement appelée pour certaines actions | Incomplète | Plusieurs actions affichent un toast ou un état local. |
| Modération des biens | `admin/properties-moderation.tsx`, `moderation.tsx` | `admin/properties-moderation/route.ts`, properties | Existante | Validation, rejet ou retrait selon les actions disponibles. |
| Signalements | `admin/signalements.tsx` | `admin/signalements/route.ts`, `signalements` | Existante | Workflow de traitement modélisé. |
| Litiges | `admin/disputes.tsx` | `disputes`, routes disputes/admin | Existante | Supervision des différends. |
| Notifications | `admin/notifications.tsx` | notifications/admin routes | Existante à confirmer | Gestion et diffusion à vérifier. |
| Sécurité/audit | `admin/security.tsx` | audit logs, connection logs, sessions | Partiellement reliée | L'étendue des journaux et controls doit être vérifiée. |
| Système et sauvegardes | `admin/system.tsx`, `admin/backups.tsx` | `/api/admin/system`, `/api/admin/backups` | Incohérente | Contrat de données des sauvegardes divergent entre UI et API. |
| Configuration | `admin/settings.tsx`, `admin/config.tsx` | `/api/admin/settings`, `platform_settings` | Doublonnée | `settings` utilise l'API ; `config` semble rester local. |
| Rapports | `admin/reports.tsx` | Aucun endpoint de rapport dédié repéré | Incomplète | Valeurs et export semblent simulés côté UI. |
| Consultation du contenu signalé | `admin/moderation.tsx` | aucune récupération/ouverture clairement appelée par l'action | Incomplète | Le bouton « Voir le contenu » ne mène pas à un détail exploitable. |

## 3. Fonctionnalités manquantes ou incomplètes

| Fonctionnalité | Constat | Preuve | Impact | Priorité |
|---|---|---|---|---|
| Rapports réels | L'écran affiche des valeurs codées en dur et un toast d'export | `src/components/dashboard/admin/reports.tsx` | Décisions admin basées sur des données fictives | P0 |
| Export structuré | Aucun export CSV/Excel complet n'est démontré | même composant, absence d'endpoint dédié | Extraction opérationnelle impossible | P1 |
| Configuration persistée unique | `admin/config.tsx` ne consomme pas l'endpoint alors que `admin/settings.tsx` le fait | composants config/settings et `/api/admin/settings` | Paramètres contradictoires | P0 |
| Actions de configuration avancée | Plusieurs tests SMTP, modèles email et sauvegardes restent des toasts ou de l'état local | `admin/config.tsx` | Paramètres non persistés ou non testables | P1 |
| Modération des avis | Aucun écran/route admin clairement dédié à la modération des ratings | admin dashboard et routes reviews | Contenu abusif difficile à traiter | P1 |
| Cohérence sauvegardes | UI et API utilisent des noms de propriétés/statuts différents | `admin/backups.tsx`, `api/admin/backups/route.ts` | Liste et états potentiellement incorrects | P0 |
| Audit des actions | Tables d'audit existent, mais la couverture de toutes actions sensibles n'est pas démontrée | `audit_logs`, routes admin | Traçabilité partielle | P1 |
| Contrôle des tâches système | Les fonctions de maintenance/paiement doivent être protégées par rôle et planification unique | routes Next et Edge Functions | Déclenchements non autorisés ou doublons | P0 |

## 4. Fonctionnalités mal associées ou insuffisamment reliées

| Élément A | Élément B | Rupture observée | Conséquence | Correction recommandée |
|---|---|---|---|---|
| `admin/reports.tsx` | backend reporting | Aucun endpoint appelé et valeurs fixes | Rapport non fiable | Créer des agrégats serveur, pagination et export contrôlé. |
| `admin/config.tsx` | `/api/admin/settings` | Bouton de sauvegarde local/toast au lieu de persister | Configuration perdue ou divergente | Utiliser un seul écran et contrat de paramètres. |
| `admin/backups.tsx` | `/api/admin/backups` | UI attend `backups`, `name`, `date`, `in_progress`; API renvoie notamment `data`, `fileName`, `createdAt`, `running` | Affichage vide ou statuts erronés | Définir un DTO partagé et tester chaque état. |
| Admin | routes sensibles | Certaines opérations système et payment jobs ont des points d'entrée multiples | Escalade ou double exécution possible | Centraliser autorisation et exécution planifiée. |
| Admin | modération avis | Aucun branchement clair entre ratings et une file de modération | Avis non gouvernés | Ajouter statut, signalement et écran de décision. |
| Admin | tiers de confiance | Gestion admin et validation TC utilisent plusieurs notions de statut | Révocation/activation ambiguë | Définir cycle de vie unique et audit. |
| Admin | données sensibles KYC | Policies de logs/vérifications à contrôler | Exposition de données biométriques | Restreindre RLS et masquer les secrets. |

## 5. Incohérences et problèmes identifiés

- Deux sections de configuration existent avec des comportements différents.
- Le rapport admin n'est pas relié à un backend de reporting identifiable.
- Le contrat backups UI/API est incompatible selon les noms de champs et statuts observés.
- La table `users` contient `password_hash` et les policies de lecture doivent empêcher toute exposition inutile.
- `service_usage_logs` et `facial_verifications` semblent avoir des politiques de lecture trop larges à vérifier.
- `service_usage_logs.user_id` est déclaré dans un type différent de `users.id`, ce qui fragilise la traçabilité.
- Les types Supabase ne couvrent pas de nombreuses tables admin/transverses.
- La modération des biens et la validation TC sont deux étapes distinctes ; leur ordre et leurs statuts doivent être explicites.

## 6. Recommandations d'amélioration

- **P0 :** supprimer la duplication de configuration et brancher toute sauvegarde à un DTO/API unique.
- **P0 :** corriger et tester le contrat backups UI/API.
- **P0 :** protéger les fonctions système, impayés et sauvegardes par un rôle explicite et un mécanisme d'exécution unique.
- **P1 :** mettre en place reporting serveur, export CSV/Excel et journalisation des filtres/exports.
- **P1 :** compléter la modération des avis et relier signalements, ratings et décisions admin.
- **P1 :** restreindre les policies sur les données sensibles et éliminer les divergences de types/identifiants.

## 7. Dépendances et interactions avec les autres acteurs

| Acteur/service | Flux | Données/événement | État de la connexion | Risque ou condition |
|---|---|---|---|---|
| Locataire | comptes, biens, candidatures, litiges, notifications | users, properties, applications, disputes | Présent | Respecter les données privées et l'audit. |
| Propriétaire | biens, documents, baux, paiements, signalements | properties, leases, payments, ownership docs | Présent | Les actions de modération doivent être réversibles/auditées. |
| Agence | comptes, mandats, agents, litiges | agency tables, mandats, commissions | Présent partiellement | Les droits délégués doivent rester séparés de l'admin. |
| Tiers de confiance | création/révocation, validations, fraudes | certifications, SLA, fraud alerts | Présent | Révocation et supervision doivent notifier les parties. |
| Supabase | données, RLS, Realtime, storage | toutes tables et policies | Central | Les types et policies doivent suivre les migrations. |
| Services externes | KYC, signature, paiement | logs, statuts, callbacks | Dépendant d'externe | Secrets, webhooks et idempotence à vérifier. |

## 8. Hypothèses, limites et informations manquantes

- Les valeurs statiques peuvent être une maquette volontaire ; elles sont classées incomplètes tant qu'aucune source serveur n'est appelée.
- La sécurité effective des routes dépend aussi des policies Supabase et de la configuration de déploiement, non entièrement vérifiables par lecture.
- Le niveau de conformité légal, store et institutionnel n'est pas déduit de la présence d'un écran.
- Les exports, sauvegardes et rapports nécessitent des tests d'exécution et de volume pour confirmer leur comportement réel.
