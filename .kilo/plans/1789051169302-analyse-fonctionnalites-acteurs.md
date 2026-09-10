# Plan d'analyse des fonctionnalités par acteur

## Objectif

Produire une analyse factuelle de la cohérence fonctionnelle et des connexions entre les acteurs de l'application Mon Toit, en se basant exclusivement sur le code actuellement présent dans le dépôt.

## Périmètre confirmé

- Acteurs à documenter : `LOCATAIRE`, `PROPRIETAIRE`, `AGENCE`, `TIERS_CONFIANCE` et `ADMIN`.
- Sources autorisées : composants React/TSX, routes API Next.js, hooks, librairies métier, types Supabase, migrations Supabase, Edge Functions, configuration d'exécution et tests présents hors `docs/`.
- Sources exclues : tous les fichiers du dossier `docs/`, qu'ils soient présents, supprimés ou récupérables via Git ; ils ne doivent servir ni de spécification ni de preuve.
- Les fonctionnalités seront classées selon des preuves de code :
  - `Existante` : interface et/ou traitement backend identifiable, avec flux exploitable.
  - `Incomplète` : une partie du flux existe mais une étape métier, une persistance, une validation ou une automatisation manque.
  - `Manquante` : aucune implémentation identifiable dans les sources examinées.
  - `Mal associée / insuffisamment reliée` : les briques existent mais leurs contrats, routes, statuts, permissions ou navigations ne correspondent pas correctement.
- Toute conclusion non démontrable sera explicitement marquée comme hypothèse ou information manquante, jamais présentée comme un fait.

## Livrables à créer

Créer un répertoire `analyse-acteurs/` et cinq fichiers Markdown distincts :

- `analyse-acteurs/locataire.md`
- `analyse-acteurs/proprietaire.md`
- `analyse-acteurs/agence.md`
- `analyse-acteurs/tiers-de-confiance.md`
- `analyse-acteurs/admin.md`

Ne pas modifier, restaurer ou compléter les fichiers de `docs/`.

## Structure homogène de chaque fichier

Chaque fichier suivra exactement cette structure :

1. `# <Nom de l'acteur>`
2. `## 1. Nom et rôle`
   - rôle fonctionnel déduit de `AuthUser`, de la sélection de rôle et des dashboards ;
   - périmètre d'accès observable ;
   - hypothèses et informations manquantes.
3. `## 2. Fonctionnalités existantes`
   - tableau `Fonctionnalité | Preuve UI | Preuve backend/données | État du flux | Observations` ;
   - références aux chemins de code et, lorsque utile, aux sections ou symboles ;
   - distinguer les fonctionnalités réellement reliées des écrans seulement décoratifs.
4. `## 3. Fonctionnalités manquantes ou incomplètes`
   - tableau `Fonctionnalité | Constat | Preuve de l'absence ou du manque | Impact | Priorité indicative` ;
   - couvrir les étapes absentes, les traitements simulés, les automatismes non déclenchés et les états non gérés ;
   - ne pas déduire une absence globale d'une seule recherche : indiquer le périmètre effectivement inspecté.
5. `## 4. Fonctionnalités mal associées ou insuffisamment reliées`
   - tableau `Élément A | Élément B | Rupture observée | Conséquence | Correction recommandée` ;
   - contrôler notamment navigation sidebar -> section, section -> route, route -> table, statuts UI/backend, format de réponse, permissions RLS et événements Realtime.
6. `## 5. Incohérences et problèmes identifiés`
   - problèmes de nommage, doublons, contrats incompatibles, sections non exposées, données codées en dur, statuts non rendus, incohérences de rôle ou de visibilité ;
   - séparer les faits observés des risques supposés.
7. `## 6. Recommandations d'amélioration`
   - recommandations priorisées `P0/P1/P2` ;
   - relier chaque recommandation à un constat et aux fichiers/boundaries concernés ;
   - privilégier les corrections de flux et de contrats avant les améliorations cosmétiques.
8. `## 7. Dépendances et interactions avec les autres acteurs`
   - tableau `Acteur/service | Flux entrant ou sortant | Données/événement partagé | État de la connexion | Risque ou condition` ;
   - couvrir au minimum les interactions locataire-propriétaire, propriétaire-agence, agence-locataire, tiers de confiance-utilisateurs/biens/dossiers, admin-tous acteurs, ainsi que paiement, KYC, signature, notifications et stockage.
9. `## 8. Hypothèses, limites et informations manquantes`
   - rappeler les éléments non vérifiables sans environnement externe, secrets, données de production ou déploiement Supabase ;
   - mentionner explicitement les fonctionnalités repérées dans le code mais dont l'exécution réelle ne peut pas être confirmée localement.

## Méthode d'analyse

1. Établir la matrice des acteurs à partir de `src/lib/auth-store.ts`, `src/components/dashboard/sidebar.tsx` et `src/components/dashboard/index.tsx`, sans prendre le README ou `docs/` comme source normative.
2. Pour chaque acteur, recenser les sections réellement rendues et les sous-composants associés.
3. Relier chaque écran à ses appels `fetch`/`authFetch`/`apiFetch`, routes `/src/app/api`, hooks Realtime et tables Supabase.
4. Relever les entités et statuts partagés dans `src/lib/supabase/types.ts` et `supabase/migrations`, puis vérifier leur cohérence avec les conditions de rendu et les transitions métier.
5. Vérifier les flux transverses : authentification et changement de rôle, dossiers, biens, visites, baux, signatures, paiements, maintenance, messages, notifications, litiges, validations, missions et certifications.
6. Examiner les Edge Functions et intégrations externes pour distinguer une façade API d'une fonctionnalité réellement utilisable, sans prétendre valider les appels externes sans configuration ou environnement de déploiement.
7. Documenter les écarts avec preuves de chemins de fichiers, en indiquant les hypothèses et le niveau de certitude.
8. Comparer les cinq fichiers entre eux pour que les mêmes flux partagés soient décrits de façon cohérente et que les dépendances croisées ne se contredisent pas.

## Points de contrôle déjà identifiés à confirmer dans le code courant

- `ADMIN` possède un dashboard propre et doit être traité comme acteur à part entière.
- La section admin `reports` semble afficher des données statiques et simuler l'export sans endpoint dédié.
- La section admin `config` semble conserver ses valeurs en état local alors qu'un endpoint de paramètres existe et est utilisé par une autre section.
- La section admin `backups` semble attendre un contrat de réponse différent de celui de `/api/admin/backups`.
- La section TC `documentation` semble statique, sans gestion backend identifiable.
- Le statut de paiement `PARTIAL` semble présent côté données/backend mais non décrit complètement dans l'UI propriétaire.
- Certaines routes métier semblent ne pas être appelées par les dashboards (`rental-file/withdraw`, annulation de bail, partage de profil), à confirmer par recherche globale hors `docs/`.
- Certaines sections de détail TC semblent accessibles par navigation interne mais absentes de la sidebar ; documenter cela comme problème de découvrabilité et non automatiquement comme fonctionnalité inexistante.

## Axes spécifiques par acteur

### Locataire

- Vérifier le parcours complet recherche de bien -> favori -> visite -> dossier locatif -> candidature -> bail -> signature -> paiement -> maintenance/litige.
- Vérifier la séparation entre `rental_files`, `applications` et `leases`, notamment le fait que le statut des candidatures réutilise `rental_file_status`.
- Vérifier les états de paiement, notamment `PARTIAL`, le callback Intouch, les notifications et le rattachement à l'échéance du bail.
- Vérifier les états des lieux entrée/sortie, les signatures des deux parties et la disponibilité des écrans de détail/archives.
- Vérifier les actions disponibles dans les écrans locataire par rapport aux routes présentes, notamment retrait de dossier, annulation de bail, partage de profil et renouvellement.

### Propriétaire

- Vérifier le cycle bien `DRAFT/PENDING_VERIFICATION/ACTIVE/RENTED/SUSPENDED/CLOSED` et son articulation avec les baux signés ou terminés.
- Vérifier le cycle dossier propriétaire, les documents de propriété et leur relation avec le bien concerné.
- Vérifier le flux propriétaire -> candidat -> acceptation/refus -> génération/signature du bail.
- Vérifier le flux maintenance, paiements reçus, impayés, avis et renouvellements.
- Vérifier le support du paiement `PARTIAL` dans `src/components/dashboard/proprietaire/finances.tsx` et les divergences avec `/src/app/api/owner/finances/route.ts`.

### Agence

- Vérifier le profil agence, les agents internes, leurs rôles, l'affectation aux biens, les mandats et les commissions.
- Contrôler les contraintes réelles entre `agency_agents`, `agency_agent_properties`, `mandats`, `properties`, `leases` et `commissions`, sans supposer qu'une relation UI garantit une contrainte de données.
- Examiner le flux de signature des mandats et confirmer les colonnes réellement disponibles dans la migration et les types.
- Vérifier si les fonctions d'agence héritées du propriétaire sont effectivement accessibles ou seulement annoncées par des écrans séparés.

### Tiers de confiance

- Vérifier les files de validation des dossiers locataire, propriétaire et agence, les commentaires, SLA, notifications et resoumissions.
- Vérifier le cycle de vérification des biens et la transition vers un bien publiable.
- Vérifier missions, agents de vérification, rapports d'état des lieux et présence d'un flux d'exécution pour l'agent terrain.
- Vérifier ONECI, NeoFace, certifications, alertes fraude et litiges, en distinguant les API disponibles des résultats réellement persistés.
- Vérifier la découvrabilité des écrans de détail TC non présents directement dans la sidebar.

### Admin

- Vérifier la gestion des utilisateurs, tiers de confiance, modération des biens, signalements, litiges, notifications, sécurité et sauvegardes.
- Vérifier les écrans `reports` et `config` contre leurs endpoints et distinguer les données persistées des valeurs statiques ou des toasts simulés.
- Vérifier le contrat de `/api/admin/backups` contre `src/components/dashboard/admin/backups.tsx`.
- Vérifier les contrôles d'autorisation des opérations sensibles et les dépendances de l'admin avec les données de tous les acteurs.

## Incohérences de modèle à documenter si confirmées

Les points suivants doivent être vérifiés directement dans les migrations et les appels avant d'être consignés dans les fichiers acteurs :

- `ownership_documents` ne semble pas porter de `property_id`, ce qui empêche d'associer un justificatif foncier à un bien précis.
- `verification_agents` semble être une fiche gérée par le TC sans lien vers `users`, alors que les missions et les visites utilisent des identifiants d'agent différents.
- `certifications` accepte le type `AGENCY` sans cible agence dédiée.
- `validation_slas` est polymorphe via `entity_type/entity_id`, sans clé étrangère forte.
- `rental_files.lease_id` et certaines colonnes de revue des candidatures doivent être comparés aux migrations avant toute conclusion.
- Les migrations couvrent davantage de tables que `src/lib/supabase/types.ts`, et les relations typées sont vides ; cela doit être traité comme un risque de cohérence et non automatiquement comme un bug d'exécution.
- La visibilité `property_documents.is_published` doit être confrontée aux politiques RLS réellement présentes.
- Les logs de services et vérifications faciales doivent être examinés sous l'angle de l'exposition de données sensibles.
- Le traitement des impayés apparaît à la fois sous forme d'Edge Function et de route Next ; vérifier l'autorisation et le risque de double exécution.
- Le flux mandat/signature doit être vérifié contre les colonnes de `mandats`, sans reprendre une hypothèse issue d'un document externe.

## Validation finale

- Vérifier que chaque livrable contient les huit sections et les mêmes colonnes de tableaux.
- Vérifier que chaque constat important cite au moins un chemin de code courant.
- Vérifier qu'aucune référence à `docs/` ou à une spécification Git historique n'est utilisée.
- Vérifier que les cinq fichiers couvrent les mêmes flux partagés avec des formulations compatibles.
- Effectuer une recherche globale des routes, sections, tables et statuts cités pour éviter les faux positifs.
- Contrôler le Markdown et les liens de chemins ; aucune modification de code n'est requise pour cette tâche documentaire.
