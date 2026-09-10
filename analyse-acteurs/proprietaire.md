# Propriétaire

## 1. Nom et rôle

Le propriétaire publie et exploite ses biens, sélectionne les candidats, contractualise, encaisse les loyers et suit l'entretien et la fin des locations. Les écrans sont regroupés dans `src/components/dashboard/proprietaire/*`, rendus par `src/components/dashboard/index.tsx` et navigués par `sidebar.tsx`.

**Hypothèses et limites :** l'analyse ne s'appuie pas sur les documents de spécification. Les comportements de déclencheurs Supabase et services externes doivent être confirmés dans un environnement déployé.

## 2. Fonctionnalités existantes

| Fonctionnalité | Preuve UI | Preuve backend/données | État du flux | Observations |
|---|---|---|---|---|
| Tableau de bord | `proprietaire/overview.tsx` | `src/app/api/dashboard/proprietaire/route.ts` | Existante | KPIs et synthèse de portefeuille. |
| Gestion des biens | `my-properties.tsx`, `add-property.tsx` | `src/app/api/properties/*`, `properties`, images | Existante | Création, édition, médias, caractéristiques et statut. |
| Dossiers propriétaire | `owner-file.tsx` | `src/app/api/owner-file/route.ts`, `owner_files` | Existante mais à relier au TC | Documents de propriétaire distincts des titres par bien. |
| Candidatures et locataires | `enhanced-rental-files.tsx`, `my-tenants.tsx`, `tenant-detail.tsx` | `applications`, `rental_files`, `tenants` | Existante | Acceptation/refus et consultation sont disponibles. |
| Visites | `visit-requests.tsx` | `src/app/api/visits/*`, `visit_requests` | Existante | Acceptation, refus et contre-proposition sont modélisés. |
| Baux et signature | `enhanced-leases.tsx` | `src/app/api/leases/*`, CRYPTONEO | Existante avec dépendance externe | Génération, signature, téléchargement et résiliation sont présents. |
| Renouvellements | `renewals.tsx`, `enhanced-leases.tsx` | `src/app/api/renewals/*`, champs de renouvellement des baux | Existante mais automatisation à confirmer | Les opérations existent ; les notifications et l'avenant signé doivent être vérifiés. |
| Mandats | `mandats.tsx` | `src/app/api/mandats/*`, `mandats` | Incomplète | L'UI existe, mais le contrat de signature doit être comparé aux colonnes réellement migrées. |
| Paiements et finances | `finances.tsx` | `owner/finances`, `payments`, Intouch | Partiellement cohérente | Le statut `PARTIAL` est calculé backend mais non configuré explicitement dans l'UI. |
| Maintenance | `owner-maintenance.tsx` | `maintenance/*`, demandes/commentaires | Existante | Suivi et traitement des demandes. |
| Analytics et avis | `analytics.tsx`, `owner-reviews.tsx` | `owner/analytics`, `owner/reviews`, `reviews/[id]/reply`, `ratings` | Existante mais déclenchement à confirmer | Les réponses aux avis existent ; l'invitation automatique à la clôture reste à vérifier. |
| Paramètres et sécurité | `owner-settings.tsx`, `security.tsx` | `user/*`, `profile/*`, sessions | Existante | Profil, sécurité et préférences sont séparés. |

## 3. Fonctionnalités manquantes ou incomplètes

| Fonctionnalité | Constat | Preuve | Impact | Priorité |
|---|---|---|---|---|
| Expiration automatique des annonces | Aucun mécanisme planifié clairement relié au statut d'annonce | aucun flux identifiable dans les composants/routes consultés | Annonces potentiellement obsolètes | P1 |
| Synchronisation bien/bail | La transition `RENTED`/`disponible` doit être vérifiée à chaque signature et clôture | `leases` et `properties` ont des statuts distincts | Recherche et disponibilité peuvent diverger | P0 |
| Mandat signé | La route de signature utilise des champs qui doivent être comparés à la migration `mandats` | `src/app/api/mandats/[id]/sign/route.ts` | Blocage potentiel de la délégation | P0 |
| Documents fonciers par bien | `ownership_documents` semble relié à l'utilisateur mais pas au bien | migration `20260518131912_create_ownership_documents.sql` | Validation TC moins probante | P0 |
| Invitation automatique à noter | Les avis et réponses existent, mais le déclenchement automatique à la clôture du bail n'est pas démontré | `owner-reviews.tsx`, `reviews/[id]/reply`, routes terminate/reviews | Avis possiblement non sollicités | P1 |
| Commission et abonnement | Les tables de commissions existent, mais le flux de facturation plateforme doit être confirmé | `commissions`, `agence/commissions`, paiements | Modèle financier incomplet | P1 |
| Impayés proactifs | Traitement d'impayé existe, mais son planificateur et son autorisation sont dupliqués | Edge Function et route payments check-overdue | Risque de double traitement | P0 |
| Restitution de caution | Aucun flux complet de décision, montant, justificatif et notification n'est visible | `payments`/`leases` sans entité dédiée identifiée | Risque de litige | P1 |

## 4. Fonctionnalités mal associées ou insuffisamment reliées

| Élément A | Élément B | Rupture observée | Conséquence | Correction recommandée |
|---|---|---|---|---|
| `finances.tsx` | `owner/finances/route.ts` | Le backend gère `PARTIAL`, `statusConfig` UI seulement `PAID`, `PENDING`, `LATE` | Affichage trompeur d'un paiement partiel | Ajouter le statut, montant restant et filtre cohérent. |
| Mandat UI | migration `mandats` | La route de signature référence des champs potentiellement absents de la table | Échec à l'écriture ou dette de schéma | Aligner migration, types et route avant activation. |
| Titre foncier | bien immobilier | Aucun `property_id` visible sur `ownership_documents` | Validation d'un propriétaire non rattachée au bien | Ajouter une relation explicite ou documenter la règle. |
| Bien | bail | Transitions de statut présentes à plusieurs endroits | Risque de bien encore publié après location | Centraliser dans une transaction/trigger idempotent. |
| Propriétaire | agence | `agency_agent_properties` ne garantit pas mandat actif et propriétaire correspondant | Délégation potentiellement trop large | Ajouter contrôles backend et contraintes métier. |
| Candidature | décision | Statut de candidature réutilise celui du dossier | Décision propriétaire difficile à distinguer de validation TC | Séparer les statuts et historiser les décisions. |

## 5. Incohérences et problèmes identifiés

- Les relations `owner_files`, `ownership_documents`, `properties` et `mandats` ne portent pas toutes le même niveau de rattachement au bien.
- Les types Supabase sont incomplets par rapport aux migrations et n'expriment pas les relations ; la fiabilité compile-time est limitée.
- La gestion des agents agence, biens affectés, mandats et commissions ne garantit pas partout l'appartenance à la même agence.
- Le modèle de paiement permet `PARTIAL` sans modèle de solde ou de réconciliation.
- Le cycle d'impayé dispose d'une Edge Function et d'une route concurrente, avec une autorisation route à vérifier.
- La clôture de bail et les avis existent séparément, sans preuve suffisante d'un déclencheur unique invitant automatiquement les parties.

## 6. Recommandations d'amélioration

- **P0 :** verrouiller les transitions de disponibilité d'un bien dans les opérations de bail et mandat.
- **P0 :** corriger le schéma de signature des mandats et ajouter des tests de contrat route/migration.
- **P0 :** rattacher les justificatifs de propriété à un bien et contrôler la visibilité par rôle.
- **P1 :** formaliser paiement partiel, impayé, caution et commissions dans des entités et statuts explicites.
- **P1 :** unifier la décision de clôture et le déclenchement des avis/notifications.
- **P2 :** compléter l'automatisation des invitations à noter et ajouter une vue d'historique financier auditée.

## 7. Dépendances et interactions avec les autres acteurs

| Acteur/service | Flux | Données/événement | État de la connexion | Risque ou condition |
|---|---|---|---|---|
| Locataire | candidature, visites, bail, paiements, maintenance | `applications`, `visit_requests`, `leases`, `payments`, `maintenance_requests` | Présent | Les statuts et permissions doivent être symétriques. |
| Agence | mandat, portefeuille, agents, commissions | `mandats`, `agency_agents`, affectations, `commissions` | Présent mais contraintes incomplètes | Vérifier mandat actif et périmètre d'accès. |
| Tiers de confiance | validation propriétaire, titres, biens | `owner_files`, `ownership_documents`, `certifications`, SLA | Présent partiellement | Le lien titre-bien est à renforcer. |
| Admin | modération, utilisateurs, litiges, signalements | `properties`, `users`, `disputes`, `signalements` | Présent | Les actions sensibles doivent être journalisées. |
| Intouch | loyers et retours de paiement | `payments` | Dépendant d'API externe | Idempotence et correspondance des transactions. |
| CRYPTONEO | bail et mandat signés | certificats, OTP, documents signés | Dépendant d'API/Edge Functions | Contrat de schéma et autorisation à confirmer. |

## 8. Hypothèses, limites et informations manquantes

- La présence d'un composant d'analytics ne prouve pas que ses indicateurs sont calculés en production.
- Les triggers Supabase de synchronisation bien/bail et les cron jobs ne peuvent être confirmés que par configuration et exécution déployées.
- La règle métier exacte de paiement des commissions et d'abonnement n'est pas explicitement observable dans les sources consultées.
- La distinction entre propriétaire individuel et agence mandataire doit être confirmée par les règles d'autorisation des routes.
