# Agence

## 1. Nom et rôle

L'agence gère un portefeuille de biens pour des propriétaires, coordonne des agents, traite les dossiers et visites, contractualise et suit ses revenus. Son périmètre est défini par `src/components/dashboard/agence/*`, `sidebar.tsx` et `index.tsx`.

**Hypothèses et limites :** le code expose un rôle agence, mais certains contrats métier dépendent de données externes ou de contraintes SQL non visibles dans l'interface.

## 2. Fonctionnalités existantes

| Fonctionnalité | Preuve UI | Preuve backend/données | État du flux | Observations |
|---|---|---|---|---|
| Tableau de bord agence | `agence/overview.tsx` | `dashboard/agence/route.ts` | Existante | Pipeline et portefeuille agrégés. |
| Portefeuille de biens | `portfolio.tsx` | `properties`, API properties et affectations | Existante mais à sécuriser | La possession effective d'un mandat doit être contrôlée. |
| Mandats | `mandats.tsx` | `src/app/api/mandats/*`, `mandats` | Incomplète | Création et signature existent, mais la cohérence de schéma est à vérifier. |
| Candidatures et dossiers clients | `candidatures.tsx`, `client-files.tsx` | applications, rental files, routes agence | Existante mais statuts à clarifier | Les dossiers visibles et décisions doivent respecter validation TC. |
| Visites | `visits.tsx` | `visit_requests`, API visits | Existante | Agent assigné et contre-proposition sont modélisés. |
| Contrats | `contracts.tsx` | `leases`, routes leases | Existante mais délégation à vérifier | La responsabilité de signature et de génération doit être explicite. |
| Équipe | `team.tsx` | `agency_agents`, `agency/users`, routes agents | Existante | Les rôles internes sont modélisés. |
| Finances/commissions | `finances.tsx` | `commissions`, owner/agence finance routes | Partiellement reliée | Le calcul, le déclenchement et le paiement des commissions restent à confirmer. |
| Analytics | `analytics.tsx` | route dashboard/analytics agence | Existante à confirmer | Présence UI ne garantit pas la qualité des agrégats. |
| Communication/marketing | `communication.tsx`, `marketing.tsx` | messages, notifications et propriétés | Partiellement reliée | Marketing et mesure de conversion ne sont pas entièrement démontrés. |
| Contrats et analytics | `contracts.tsx`, `analytics.tsx` | routes de contrats/agrégats | Incomplète sur les exports | Les écrans existent, mais les boutons d'export déclenchent un toast « à venir ». |
| Rappels de visites | `visits.tsx` | `visit_requests`, notifications | Incomplète | Le bouton est affiché mais aucun appel d'envoi n'est identifié. |
| Paramètres/sécurité | `settings.tsx`, `security.tsx` | profile, sessions, notifications | Existante | Gestion du compte agence et préférences. |

## 3. Fonctionnalités manquantes ou incomplètes

| Fonctionnalité | Constat | Preuve | Impact | Priorité |
|---|---|---|---|---|
| Validation agence complète | Le TC peut valider une agence, mais le modèle de cible et les pièces exactes doivent être reliés | `agency-validations.tsx`, `validation_slas`, `certifications` | Statut agence difficile à fiabiliser | P0 |
| Mandat signé exploitable | Les champs utilisés par la route de signature doivent être présents dans le schéma | `mandats/[id]/sign/route.ts` vs migration mandats | Blocage de l'administration déléguée | P0 |
| Autorisation portefeuille | Les tables d'affectation ne garantissent pas mandat actif, propriétaire correspondant et agence correspondante | `agency_agent_properties`, `mandats` | Accès à des biens hors mandat | P0 |
| Agent authentifiable | `verification_agents` concerne le TC, mais les agents agence doivent être reliés à des utilisateurs/permissions | `agency_agents` et `users` | Audit et accès individuel incomplets | P1 |
| Commissions de bout en bout | Table présente, mais événement de création et rapprochement avec bail/paiement non démontrés | `commissions`, `leases`, `payments` | Revenus agence non fiables | P1 |
| Finances consolidées | Les écrans existent, mais les sources et filtres multi-biens doivent être vérifiés | `agence/finances.tsx` | Reporting potentiellement approximatif | P1 |
| Export contrats/analytics | Les boutons sont présents mais déclenchent un toast au lieu de produire un fichier | `agence/contracts.tsx`, `agence/analytics.tsx` | Extraction opérationnelle indisponible | P1 |
| Rappels de visite | Le bouton d'action est présent sans appel API d'envoi repéré | `agence/visits.tsx` | Les participants peuvent ne pas être rappelés | P1 |
| Marketing mesurable | Promotion de biens existe comme section, sans preuve d'un pipeline campagne/statistiques | `marketing.tsx` | Action sans retour sur investissement | P2 |

## 4. Fonctionnalités mal associées ou insuffisamment reliées

| Élément A | Élément B | Rupture observée | Conséquence | Correction recommandée |
|---|---|---|---|---|
| Agent agence | `users` | `agency_agents` possède une fiche d'agent mais la relation à un utilisateur doit être vérifiée | Attribution et audit difficiles | Ajouter/contraindre `user_id` et vérifier les rôles. |
| Agent | Bien | Affectation seule par `agency_agent_properties` | Un agent peut théoriquement toucher un bien hors mandat | Contrôler agence, propriétaire et mandat actif côté serveur. |
| Mandat | Signature | Route et migration semblent diverger sur les colonnes de signature/document | Flux agence-propriétaire fragile | Aligner schéma, route, types et stockage. |
| Commission | Bail/paiement | Les clés existent mais l'événement métier de création n'est pas explicite | Commission manquante ou doublonnée | Définir un événement idempotent à la contractualisation/paiement. |
| Agence | Validation TC | `AGENCY` est un type de certification sans cible `agency_id` dédiée | Certificat agence ambigu | Ajouter la cible ou formaliser l'identification par `user_id`. |
| Agence | Locataire | Les dossiers et visites sont partagés, mais la frontière après validation TC doit être explicite | Exposition prématurée de documents | Appliquer une policy métier « validé avant décision ». |

## 5. Incohérences et problèmes identifiés

- La table `certifications` accepte le type `AGENCY` sans champ agence dédié.
- Les contraintes entre mandat, bien, agence, agent et commission ne sont pas toutes exprimées par des clés étrangères ou contrôles backend.
- La nomenclature `owner-file` côté propriétaire et `tc/owner-files` côté tiers rend la correspondance moins lisible.
- Les statuts de candidature réutilisent le statut du dossier locatif, ce qui affecte aussi la lecture côté agence.
- Le rôle agence existe dans l'authentification, mais la relation entre compte agence et agents opérationnels doit être vérifiée au niveau des données.
- Les types Supabase ne couvrent pas toutes les tables agence et ne déclarent pas les relations.

## 6. Recommandations d'amélioration

- **P0 :** rendre le mandat la condition d'accès au portefeuille et à ses opérations.
- **P0 :** corriger le contrat de signature des mandats et tester le stockage des documents signés.
- **P1 :** relier chaque agent agence à un utilisateur avec permissions explicites et journalisation.
- **P1 :** définir la création, validation, annulation et paiement d'une commission autour d'événements idempotents.
- **P1 :** distinguer statut de validation TC, statut de candidature et statut de mandat.
- **P2 :** relier marketing à des métriques vérifiables et non à une simple section d'interface.

## 7. Dépendances et interactions avec les autres acteurs

| Acteur/service | Flux | Données/événement | État de la connexion | Risque ou condition |
|---|---|---|---|---|
| Propriétaire | mandat, biens, candidats, contrats, finances | `mandats`, `properties`, `applications`, `leases` | Présent | Mandat actif et périmètre des droits à imposer. |
| Locataire | visites, dossiers, messages, bail | `visit_requests`, `rental_files`, `applications`, `leases` | Présent | Ne donner accès qu'aux dossiers autorisés. |
| Tiers de confiance | validation agence, biens, dossiers | `validation_slas`, dossiers, certifications | Présent partiellement | Cible de certification agence à clarifier. |
| Admin | utilisateurs, modération, litiges | `users`, `properties`, `signalements`, `disputes` | Présent | Actions de gouvernance doivent être auditables. |
| Paiement | commissions et éventuels revenus | `payments`, `commissions`, Intouch | Partiellement relié | Aucun rapprochement complet confirmé. |
| Signature | mandat et bail | CRYPTONEO, documents | Dépendant d'externe | Contrat de schéma à stabiliser. |

## 8. Hypothèses, limites et informations manquantes

- La présence d'une section agence ne prouve pas qu'un agent individuel peut se connecter avec des droits distincts.
- Les opérations de commission et la facturation ne peuvent pas être validées sans observer les données et événements en exécution.
- Le code ne permet pas à lui seul de confirmer les accords institutionnels ou les règles contractuelles de délégation.
- Les fonctions héritées du propriétaire sont considérées comme interactions potentielles tant qu'un appel ou une autorisation agence n'est pas identifié.
