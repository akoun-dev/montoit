# Locataire

## 1. Nom et rôle

Le locataire recherche un bien, constitue un dossier, échange avec les autres parties, visite un logement, contractualise puis paie et suit sa location. Le rôle est défini dans `src/lib/auth-store.ts` et ses écrans sont assemblés dans `src/components/dashboard/index.tsx` et `src/components/dashboard/sidebar.tsx`.

**Hypothèses et limites :** l'analyse porte sur les composants, routes, migrations, hooks et fonctions Edge présents dans le dépôt. La disponibilité réelle des services Intouch, ONECI, NeoFace, CRYPTONEO et des tâches planifiées n'est pas vérifiable sans environnement externe.

## 2. Fonctionnalités existantes

| Fonctionnalité | Preuve UI | Preuve backend/données | État du flux | Observations |
|---|---|---|---|---|
| Authentification et inscription | `src/components/auth/*` | `src/app/api/auth/*`, `users`, `sessions`, `otp_codes` | Existante | Email, SMS OTP, vérification et réinitialisation sont reliés au store d'authentification. |
| Profil et paramètres | `src/components/dashboard/locataire/settings/*` | `src/app/api/user/*`, `src/app/api/profile/*` | Existante mais à contrôler | KYC, téléphone, email, mot de passe et suppression de compte sont exposés par plusieurs routes. |
| Recherche de biens | `search-properties.tsx`, `src/components/home/*` | `src/app/api/properties/*`, table `properties` | Existante | Filtres, détail, carte et consultation publique sont présents. |
| Favoris | `favorites.tsx`, `src/lib/use-favorites.ts` | `src/app/api/favorites/*`, table `favorites` | Existante | La relation utilisateur-bien est explicite. |
| Recherches sauvegardées et alertes | `favorites.tsx` et état de recherche | `src/app/api/search-alerts/route.ts`, `src/app/api/search-alerts/[id]/route.ts` | Existante | Création/restauration, activation, désactivation et suppression sont exposées côté API ; le déclenchement des notifications reste à vérifier. |
| Visites | `my-visits.tsx`, `visit-detail.tsx`, modal de détail bien | `src/app/api/visits/*`, `visit_requests` | Existante | Les statuts couvrent demande, acceptation, refus, contre-proposition, annulation et clôture. |
| Dossier locatif | `rental-file.tsx`, `rental-files-list.tsx`, `application-detail.tsx` | `src/app/api/rental-file*`, `src/app/api/applications*`, `rental_files`, documents | Partiellement reliée | Le flux existe, mais candidature et dossier partagent un statut de dossier. |
| Messagerie et notifications | `messages.tsx`, `notifications.tsx` | `src/app/api/messages*`, `notifications`, Realtime hooks | Existante | Les conversations temps réel et les notifications sont présentes. |
| Bail et signature | `my-leases.tsx`, `lease-detail.tsx`, `signature-pad.tsx` | `src/app/api/leases/*`, Edge Functions CRYPTONEO | Existante avec dépendance externe | Le parcours signature comporte saisie, OTP et stockage d'image/PDF. |
| Paiement du loyer | `payments.tsx`, `payment-dialog.tsx`, `payment-detail.tsx` | `src/app/api/payments/*`, Edge Functions Intouch, `payments` | Existante mais états incomplets | Orange Money, MTN MoMo, Moov Money et Wave sont modélisés. |
| Paiement immédiat et anticipé | `payment-dialog.tsx`, `payments.tsx` | `payments/advance`, `payments/paiement-immediat`, callback Intouch | Existante avec dépendance externe | Les routes couvrent plusieurs modes ; la réconciliation métier reste à contrôler. |
| Maintenance | `maintenance.tsx` | `src/app/api/maintenance/*`, `maintenance_requests`, commentaires | Existante | Les statuts de suivi sont modélisés ; les droits TC doivent être vérifiés. |
| Litiges et avis | `shared/my-disputes.tsx`, `reviews.tsx` | `src/app/api/disputes*`, `src/app/api/reviews*`, `disputes`, `ratings` | Partiellement reliée | Les écrans existent, mais le déclenchement automatique de notation à la clôture n'est pas établi. |
| États des lieux | Écran TC `inventory-report-form.tsx` et composants associés | `inventory_reports`, `inventory_report_items` | Insuffisamment reliée | Le modèle distingue entrée et sortie, mais le parcours locataire direct n'est pas clairement exposé. |

## 3. Fonctionnalités manquantes ou incomplètes

| Fonctionnalité | Constat | Preuve | Impact | Priorité |
|---|---|---|---|---|
| Relance de signature | Aucun déclencheur démontré pour relancer une signature après un délai | routes de signature présentes, mais pas de job associé identifiable | Baux pouvant rester bloqués | P0 |
| Rappels automatiques visite/paiement | Les types et préférences existent, mais le déclenchement J-1/J-3 n'est pas démontré | `notification_preferences`, hooks de notifications, absence de flux planifié confirmé | Risque de rendez-vous manqués et d'impayés | P1 |
| Paiement partiel | `PARTIAL` existe, sans montant payé/restant ni historique de tentatives | migration `20260518131922_create_payments.sql`, finances propriétaire | Solde et rapprochement ambigus | P0 |
| Quittance et reçu de caution | Aucun modèle ou flux complet de reçu de dépôt et restitution n'est identifiable | composants de paiement et table `payments` | Traçabilité financière incomplète | P1 |
| Déclenchement automatique du renouvellement | Les routes de renouvellement et l'UI existent, mais la notification à échéance et l'avenant signé doivent être confirmés | `src/app/api/renewals/*`, `locataire/my-leases.tsx` | Cycle automatisé incomplet à confirmer | P1 |
| Dossiers multiples | Aucun modèle de versions de dossier par configuration familiale/garant | `rental_files` sans version fonctionnelle visible | Réutilisation limitée du dossier | P2 |
| État des lieux locataire entrée/sortie | Les données existent mais l'accès, la signature bilatérale et les archives ne forment pas un parcours unique démontré | migration inventory et dashboards | Risque de litige mal couvert | P1 |
| Partage de profil | La route existe, mais aucune référence UI locataire n'a été trouvée | `src/app/api/profile/share/route.ts` | Fonction inaccessible depuis le dashboard | P2 |

## 4. Fonctionnalités mal associées ou insuffisamment reliées

| Élément A | Élément B | Rupture observée | Conséquence | Correction recommandée |
|---|---|---|---|---|
| `applications` | `rental_file_status` | Une candidature réutilise le statut du dossier locatif | Impossible de distinguer clairement validation TC et décision propriétaire/agence | Introduire un statut de candidature propre et mapper explicitement les transitions. |
| Retrait de dossier | `/api/rental-file/withdraw` | Route présente sans appel UI repéré | Action métier indisponible | Ajouter l'action dans la liste/détail et invalider les caches associés. |
| Annulation de bail | `/api/leases/[id]/cancel` | Les écrans utilisent d'autres chemins (`DELETE`, terminate ou mise à jour directe) | Parcours et règles divergents | Choisir un contrat d'annulation unique et l'utiliser dans l'UI. |
| Paiement | `payments` / Intouch callback | Risque de doublons lors de callbacks concurrents, absence de contrainte `lease_id + due_date` | Échéances incohérentes | Rendre le callback idempotent et ajouter une contrainte métier. |
| KYC locataire | `neoface_verified`, `oneci_verified`, historiques | Les fournisseurs n'ont pas le même niveau d'historisation et les scores ne sont pas uniformes | Statut de confiance difficile à expliquer | Centraliser un résultat KYC normalisé avec preuve et fournisseur. |
| Documents locatifs | Storage/RLS | Les droits réels doivent être vérifiés pour chaque type de document | Risque d'exposition ou d'accès insuffisant | Tester les policies et documenter les propriétaires de chaque fichier. |

## 5. Incohérences et problèmes identifiés

- `src/lib/supabase/types.ts` ne couvre pas toutes les tables utilisées par les flux et déclare `Relationships: []` ; le code compense par des assertions faibles.
- Les migrations modélisent `leases.rental_file_id`, tandis qu'une route locataire semble attendre `rental_files.lease_id` ; la direction de relation doit être uniformisée.
- Les statuts de paiement couvrent `PARTIAL`, mais l'interface et le modèle financier ne représentent pas le solde.
- Les états des lieux sont principalement exposés dans le périmètre tiers de confiance ; la responsabilité du locataire dans la signature et l'accès aux archives n'est pas explicite.
- Les alertes de recherche sont bien modélisées par des routes, mais leur déclenchement automatique et leur exposition complète dans la navigation restent à vérifier.
- Le statut d'authentification persistant est géré dans Zustand et côté session ; les erreurs réseau et expiration doivent rester cohérentes avec les écrans de navigation.

## 6. Recommandations d'amélioration

- **P0 :** définir les contrats de statuts et transitions séparés pour dossier, candidature, bail et paiement.
- **P0 :** rendre les callbacks de paiement et signature idempotents, avec journal des tentatives et contrôle d'autorisation.
- **P1 :** créer un parcours locataire complet pour états des lieux, renouvellement, quittance et restitution de caution.
- **P1 :** brancher les rappels et relances sur des tâches planifiées vérifiables et observables.
- **P1 :** compléter les types Supabase et supprimer progressivement les accès non typés sur les entités locatives.
- **P2 :** relier les routes existantes de retrait et partage de profil aux écrans appropriés.

## 7. Dépendances et interactions avec les autres acteurs

| Acteur/service | Flux | Données/événement | État de la connexion | Risque ou condition |
|---|---|---|---|---|
| Propriétaire | candidature, visite, bail, paiement, maintenance, avis | `properties`, `applications`, `visit_requests`, `leases`, `payments` | Présent par routes et composants | Statuts et décisions doivent rester alignés. |
| Agence | candidature, visite, mandat, contrat, communication | `mandats`, biens, candidatures, contrats | Présent mais dépend de la délégation agence | Les droits sur les biens et dossiers doivent être vérifiés. |
| Tiers de confiance | validation du dossier, KYC, états des lieux, certification | `rental_files`, documents, `validation_slas`, `certifications` | Présent côté backend/UI TC | La date de validité et les demandes de complément doivent être explicites. |
| Admin | modération, comptes, litiges, signalements | `users`, `properties`, `disputes`, `signalements`, audit logs | Présent | Les décisions admin doivent être auditables et autorisées. |
| Intouch | paiement mobile money | `payments`, callbacks | Dépend d'un service externe | Signature, idempotence et secrets non vérifiables localement. |
| ONECI/NeoFace | identité et biométrie | champs KYC et historiques | Dépend d'API externes | Les résultats doivent être persistés de façon homogène. |
| CRYPTONEO | signature de bail | alias, OTP, certificat, PDF | Dépend d'API/Edge Functions | Vérifier l'exposition des tokens et le contrôle de rôle. |

## 8. Hypothèses, limites et informations manquantes

- Une route présente est considérée comme disponible seulement si son contrat et son appel UI peuvent être identifiés ; son déploiement effectif n'est pas déduit.
- Les jobs planifiés, webhooks externes, policies distantes et secrets ne sont pas validés par la seule lecture du dépôt.
- Le rôle exact du locataire dans l'état des lieux de sortie et la restitution de caution nécessite une règle métier explicite.
- La relation entre les résultats KYC et l'autorisation de déposer une candidature n'est pas entièrement démontrée dans les sources examinées.
