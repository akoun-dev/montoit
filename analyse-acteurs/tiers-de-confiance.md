# Tiers de confiance

## 1. Nom et rôle

Le tiers de confiance contrôle les biens, dossiers et identités, affecte des missions terrain, émet des certifications, suit les SLA et traite fraude/litiges. Le rôle est défini dans `src/lib/auth-store.ts`; ses écrans sont dans `src/components/dashboard/tc/*`.

**Hypothèses et limites :** un agent terrain n'est pas assimilé au tiers de confiance connecté ; le dépôt montre la gestion de fiches d'agents, mais pas nécessairement leur authentification.

## 2. Fonctionnalités existantes

| Fonctionnalité | Preuve UI | Preuve backend/données | État du flux | Observations |
|---|---|---|---|---|
| Tableau de bord et files | `tc/overview.tsx`, `rental-files-queue.tsx` | `dashboard/tc`, `validation_slas` | Existante | KPIs, files et suivi SLA sont représentés. |
| Validation dossiers locataires | `dossier-validations.tsx`, `rental-file-detail.tsx` | `tc/rental-files`, `rental_files`, documents | Existante mais transitions à préciser | Documents et décisions sont consultables. |
| Validation propriétaires | `owner-validations.tsx`, `owner-dossier-validations.tsx` | `tc/owner-files`, `owner_files` | Existante | Parcours séparé du dossier locataire. |
| Validation agences | `agency-validations.tsx`, `agency-detail.tsx` | routes TC, SLA, certifications | Partiellement reliée | L'entité agence n'a pas de cible dédiée partout. |
| Vérification des biens | `property-verifications.tsx`, `property-verify-detail.tsx` | admin/TC property routes, `properties` | Existante | Le statut `PENDING_VERIFICATION` est traité. |
| ONECI/NeoFace | `oneci-verification.tsx` | Edge Functions ONECI/NeoFace, champs users | Existante avec dépendance externe | Plusieurs méthodes sont présentes. |
| Missions et agents | `missions.tsx`, `agents.tsx` | `missions`, `verification_agents` | Partiellement reliée | L'agent n'est pas relié à un compte utilisateur. |
| États des lieux | `inventory-report-form.tsx`, `inventory-reports-list.tsx` | `inventory_reports`, items, Realtime | Existante | Entrée/sortie sont prévues par le modèle. |
| Certifications | `certifications.tsx` | `certifications`, routes TC | Existante | Octroi/révocation/expiration sont modélisés. |
| Fraude et litiges | `fraud-alerts.tsx`, `litiges.tsx` | `fraud_alerts`, `disputes` | Existante | Les workflows de suivi sont présents. |
| Messagerie, SLA, documentation | `messaging.tsx`, `sla-monitoring.tsx`, `documentation.tsx` | messages/SLA ; documentation statique | Partiellement reliée | La documentation ne possède pas de backend identifié. |

## 3. Fonctionnalités manquantes ou incomplètes

| Fonctionnalité | Constat | Preuve | Impact | Priorité |
|---|---|---|---|---|
| Agent terrain connecté | Fiche d'agent sans lien `users` ni parcours d'authentification propre | migration `verification_agents`, `tc/agents.tsx` | Mission non exécutable par un acteur distinct | P0 |
| Notification de mission | La création de mission notifie le TC plutôt que l'agent terrain | route `tc/missions/route.ts` | Agent potentiellement non informé | P0 |
| Durée de validité dossier | Les dossiers ont des champs de validité, mais la décision et expiration opérationnelle doivent être vérifiées | `rental_files`, SLA et composants TC | Dossiers validés possiblement périmés | P1 |
| Demande de complément | Commentaires présents, mais workflow dédié, notification et reprise ne sont pas homogènes | détail dossiers et notifications | Reprises ambiguës | P1 |
| Validation agence | Pas de table dossier agence dédiée et certification `AGENCY` sans `agency_id` | migrations `certifications`, `validation_slas` | Cible de validation ambiguë | P0 |
| Historisation ONECI | Les réponses et scores ne sont pas persistés comme les vérifications NeoFace | Edge Functions ONECI vs `facial_verifications` | Audit KYC incomplet | P1 |
| Documentation administrable | `documentation.tsx` est statique sans route de gestion | composant documentation | Guides non versionnés | P2 |

## 4. Fonctionnalités mal associées ou insuffisamment reliées

| Élément A | Élément B | Rupture observée | Conséquence | Correction recommandée |
|---|---|---|---|---|
| `verification_agents` | `users` | Absence de relation utilisateur | Pas d'identité, session ou audit agent | Ajouter un compte lié ou assumer explicitement un modèle d'agent hors plateforme. |
| Mission | Agent | `missions.agent_id` cible `verification_agents`, tandis que visite utilise un autre identifiant d'agent | Modèles d'agent incompatibles | Normaliser les identifiants et responsabilités. |
| Mission | Notification | Notification envoyée au TC | Agent terrain non informé | Notifier l'agent lié et conserver une copie au TC. |
| SLA | Entité validée | `entity_type/entity_id` polymorphe sans FK | Références orphelines possibles | Ajouter contraintes applicatives, triggers et audit. |
| Certification | Agence | Type `AGENCY` sans cible dédiée | Certification difficile à rattacher | Ajouter `agency_id` ou une convention documentée et contrainte. |
| Documentation | Backend | Contenu local statique | Pas de version ni gestion admin | Créer une entité documentaire ou supprimer la promesse de gestion. |
| Document bien | RLS | `is_published` ajouté mais policies publiques à confronter | Document potentiellement visible malgré statut | Appliquer la visibilité dans les policies et queries. |

## 5. Incohérences et problèmes identifiés

- La gestion de missions suppose un agent terrain mais aucun compte utilisateur associé n'est visible.
- Les agents du TC et les agents d'agence sont deux modèles différents, ce qui augmente le risque d'erreur dans les affectations.
- `validation_slas` utilise une relation polymorphe sans clé étrangère forte.
- Les tables métiers avancées sont absentes de `src/lib/supabase/types.ts`, ce qui fragilise les routes TC.
- NeoFace historise ses vérifications alors que ONECI persiste principalement un indicateur sur `users`.
- Les statuts de vérification faciale sont des textes libres ; le statut utilisateur peut diverger de l'historique.
- Les logs de services et de vérifications faciales doivent être examinés au regard de leurs policies de lecture.
- Plusieurs écrans de détail sont rendus par `index.tsx` mais pas exposés directement dans la sidebar ; la découvrabilité dépend de navigation interne.

## 6. Recommandations d'amélioration

- **P0 :** décider le modèle opérationnel de l'agent terrain : utilisateur connecté ou ressource interne du TC.
- **P0 :** sécuriser les cibles de validation agence, SLA, certification et documents fonciers.
- **P1 :** centraliser les statuts de validation, demande de complément, expiration et resoumission.
- **P1 :** uniformiser l'historisation ONECI/NeoFace et les preuves associées à chaque décision.
- **P1 :** corriger le routage des notifications de mission et vérifier les canaux push/email.
- **P2 :** versionner les guides de documentation ou les présenter explicitement comme contenu embarqué.

## 7. Dépendances et interactions avec les autres acteurs

| Acteur/service | Flux | Données/événement | État de la connexion | Risque ou condition |
|---|---|---|---|---|
| Locataire | dossier, pièces, KYC, état des lieux | `rental_files`, documents, `facial_verifications` | Présent | Décision et durée de validité à notifier. |
| Propriétaire | identité, titres, biens, états des lieux | `owner_files`, `ownership_documents`, `properties` | Présent mais lien titre-bien faible | Validation doit porter sur le bien précis. |
| Agence | agrément, gérant, portefeuille | `agency_agents`, certifications, SLA, mandats | Partiellement relié | Cible d'agence à formaliser. |
| Admin | gestion des TC, modération, fraude, litiges | users, certifications, fraud alerts, disputes | Présent | Révocation et décisions doivent être auditées. |
| ONECI/NeoFace | vérification identité | users, logs, historiques biométriques | Dépendant d'externe | Résultats et données sensibles à protéger. |
| CRYPTONEO | certifications/signatures éventuelles | certificats, documents | Dépendant d'externe | Contrôle des tokens et opérations. |
| Notifications | résultats, compléments, missions, SLA | `notifications`, préférences | Présent | Déclencheurs automatiques à confirmer. |

## 8. Hypothèses, limites et informations manquantes

- La liste d'un agent dans l'interface TC ne prouve pas qu'il peut se connecter ou exécuter une mission.
- La conformité des validations et SLA nécessite de vérifier les policies et jobs sur Supabase déployé.
- Les appels ONECI/NeoFace ne peuvent pas être validés sans clés et réponses réelles ; seule l'intégration de code est constatée.
- Le rôle exact du tiers dans les états des lieux et les litiges doit être confirmé par des règles métier explicites.
