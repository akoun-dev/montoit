# Services de Gestion des Contrats

## Vue d'ensemble

Ce document présente les services créés pour la gestion des contrats de location dans l'interface "Mes contrats" du propriétaire.

## Fonctionnalités Implémentées ✅

### 1. Signature Numérique des Contrats

**Service** : `signatureService.ts`
**Fonctionnalité** : Permet aux propriétaires et locataires de signer électroniquement leurs contrats de bail.

**Fonctions principales** :

- `saveContractSignature()` - Enregistre une signature avec traçabilité (IP, user agent, timestamp)
- `hasUserSigned()` - Vérifie si un utilisateur a déjà signé
- `getContractSignatures()` - Récupère l'historique des signatures d'un contrat
- `sendSignatureNotification()` - Envoie une notification à l'autre partie après signature
- `canvasToBase64()` - Convertit un canvas en base64
- `getClientIP()` - Récupère l'adresse IP pour traçabilité

**Tables nécessaires** :

- `electronic_signature_logs` (logs des signatures électroniques)
- `lease_contracts` (colonnes : `owner_signed_at`, `tenant_signed_at`)

**Intégration** : [`ContractDetailPage.tsx`](../../pages/tenant/ContractDetailPage.tsx:1)

---

### 2. Renouvellements de Baux

**Service** : Intégré dans [`OwnerContractsPage.tsx`](../../pages/owner/OwnerContractsPage.tsx:1)
**Fonctionnalité** : Permet de gérer les demandes de renouvellement de baux.

**Fonctions principales** :

- `loadRenewals()` - Charge les renouvellements depuis la base
- `openRenewalModal()` - Ouvre le modal de création de renouvellement
- `handleCreateRenewal()` - Crée un nouveau renouvellement

**Tables nécessaires** :

- `lease_renewals` (colonnes : id, contract_id, proposed_end_date, proposed_rent, status, notes, created_at)

**Interface** :

- Liste des demandes de renouvellement avec badges de statut
- Modal de création avec formulaire (nouvelle date de fin, nouveau loyer, pourcentage d'augmentation, notes)
- Alert "Baux expirant prochainement" avec compteur de jours restants

---

### 3. Préavis de Départ

**Service** : Intégré dans [`OwnerContractsPage.tsx`](../../pages/owner/OwnerContractsPage.tsx:1)
**Fonctionnalité** : Permet de gérer les préavis de départ des locataires.

**Fonctions principales** :

- `loadDepartureNotices()` - Charge les préavis depuis la base
- `openNoticeModal()` - Ouvre le modal de création de préavis
- `handleCreateNotice()` - Crée un nouveau préavis

**Tables nécessaires** :

- `departure_notices` (colonnes : id, contract_id, initiator_id, departure_date, reason, status, notes, created_at)

**Interface** :

- Liste des préavis en cours avec initiateur, statut, dates et montant de caution
- Modal de création avec formulaire (date de départ, motif, détails)
- Information légale sur le délai de 3 mois

---

### 4. États des Lieux

**Service** : Intégré dans [`OwnerContractsPage.tsx`](../../pages/owner/OwnerContractsPage.tsx:1)
**Fonctionnalité** : Permet de créer et gérer les états des lieux d'entrée et de sortie.

**Tables nécessaires** :

- `inventory_reports` (colonnes : id, contract_id, type, report_date, property_condition, notes, created_by, created_at)

**Interface** :

- Section "États des lieux" avec bouton pour créer un état des lieux pour chaque contrat actif
- Redirection vers la page des états des lieux existante

---

### 5. Tableau de Bord avec Statistiques

**Service** : Intégré dans [`OwnerContractsPage.tsx`](../../pages/owner/OwnerContractsPage.tsx:1)
**Fonctionnalité** : Permet de visualiser les statistiques globales sur les contrats.

**Statistiques affichées** :

- Revenu mensuel total (somme de tous les loyers)
- Caution totale (somme de tous les dépôts de garantie)
- Contrats signés (nombre de contrats où propriétaire et locataire ont tous les deux signés)
- En attente de signature (nombre de contrats non signés par au moins une partie)

---

## Fonctionnalités en Cours de Développement 🚧

### 6. Suivi des Paiements de Loyer

**Service** : `rentPaymentService.ts`
**Fonctionnalité** : Permet de suivre tous les paiements de loyer pour chaque contrat.

**Fonctions principales** :

- `getContractPayments()` - Récupère tous les paiements d'un contrat
- `getPaymentStats()` - Calcule les statistiques de paiement
- `createRentPayment()` - Crée un nouveau paiement
- `updatePaymentStatus()` - Met à jour le statut d'un paiement
- `deleteRentPayment()` - Supprime un paiement
- `getLatePaymentsByOwner()` - Récupère les paiements en retard pour tous les contrats d'un propriétaire

**Interface prévue** :

- Historique des paiements par contrat avec statut (payé, en retard, en attente)
- Indicateurs visuels de paiement (à jour, en retard)
- Possibilité d'ajouter des paiements manuels
- Calcul automatique du taux de ponctualité

**Tables nécessaires** :

- `rent_payments` (colonnes : id, contract_id, tenant_id, amount, payment_date, payment_method, status, notes, created_at, updated_at)

---

### 7. Gestion du Dépôt de Garantie

**Service** : `depositService.ts`
**Fonctionnalité** : Permet de gérer le déblocage et la restitution des dépôts de garantie.

**Fonctions principales** :

- `getContractDeposit()` - Récupère le dépôt de garantie d'un contrat
- `getDepositStatsByOwner()` - Statistiques globales des dépôts
- `releaseDeposit()` - Libère le dépôt de garantie
- `updateDepositStatus()` - Met à jour le statut du dépôt
- `partialDepositRelease()` - Déblocage partiel avec déductions
- `getPendingDeposits()` - Récupère les dépôts en attente de libération

**Interface prévue** :

- Boutons pour déblocer la caution
- Formulaire de restitution avec déductions possibles
- Historique des déblocages et restitutions
- Intégration avec les états des lieux

**Tables nécessaires** :

- `lease_contracts` (colonnes supplémentaires : `deposit_status`, `deposit_release_date`, `deposit_deduction_amount`, `deposit_deduction_reason`)

---

### 8. Indexation Automatique du Loyer

**Service** : `rentIndexationService.ts`
**Fonctionnalité** : Calcule et applique automatiquement l'indexation du loyer selon la législation ivoirienne.

**Fonctions principales** :

- `canIndexContract()` - Vérifie si un contrat peut être indexé
- `calculateRentIndexation()` - Calcule l'indexation légale (5% par an)
- `getContractIndexations()` - Récupère l'historique des indexations
- `createRentIndexation()` - Crée une nouvelle indexation
- `applyRentIndexation()` - Applique l'indexation au contrat
- `getPendingIndexations()` - Récupère les indexations en attente
- `formatPercentage()` - Formate un pourcentage pour l'affichage
- `formatCurrency()` - Formate un montant en devise FCFA

**Règles légales** :

- Taux d'indexation légal : 5% par an en Côte d'Ivoire
- Délai minimum entre deux indexations : 12 mois
- Calcul automatique du nouveau loyer avec augmentation légale

**Interface prévue** :

- Calcul automatique de l'augmentation légale
- Affichage du pourcentage d'augmentation
- Historique des indexations par contrat
- Notifications pour les indexations en attente

**Tables nécessaires** :

- `rent_indexations` (colonnes : id, contract_id, previous_rent, new_rent, indexation_rate, indexation_date, effective_date, reason, created_at)
- `lease_contracts` (colonnes supplémentaires : `last_indexation_date`)

---

## Fonctionnalités Restantes à Implémenter (11/21) 📋

### 9. Rappels Automatiques de Signature ✅

**Edge Function** : `send-signature-reminders`
**Fonctionnalité** : Envoi automatique de rappels pour les signatures de baux en attente.

**Fonctions principales** :

- Récupère tous les contrats en statut `pending_signature`
- Envoie des rappels automatiques à J+3, J+7, et J+14 après l'entrée en statut pending
- Traçabilité des rappels envoyés (timestamp et compteur)
- Support du mode dry-run pour les tests
- Notifications in-app avec lien direct vers la signature

**Tables nécessaires** :

- `lease_contracts` (colonnes ajoutées : `last_signature_reminder`, `signature_reminder_count`)

**Migration** : `20260322140000_add_signature_reminder_tracking.sql`

**Usage** :

```bash
# Production
curl -X POST https://xxx.supabase.co/functions/v1/send-signature-reminders \
  -H "Authorization: Bearer <service_role_key>"

# Dry run (testing)
curl -X POST https://xxx.supabase.co/functions/v1/send-signature-reminders \
  -H "Authorization: Bearer <service_role_key>" \
  -d '{"dryRun": true}'
```

**Cron job recommandé** : Exécution quotidienne à 9h pour vérifier et envoyer les rappels

---

### 10. Demandes d'Avis Automatiques ✅

**Edge Function** : `send-review-requests`
**Fonctionnalité** : Envoi automatique de demandes d'avis aux deux parties lors de la fin d'un bail.

**Fonctions principales** :

- Détecte les contrats résiliés ou expirés sans demande d'avis envoyée
- Envoie des notifications aux deux parties (propriétaire et locataire)
- Évite les doublons avec un flag de suivi
- Support du mode dry-run pour les tests
- Peut être déclenché pour un contrat spécifique

**Tables nécessaires** :

- `lease_contracts` (colonnes ajoutées : `review_request_sent`, `review_request_sent_at`)

**Migration** : `20260322150000_add_review_request_tracking.sql`

**Usage** :

```bash
# Production (tous les contrats éligibles)
curl -X POST https://xxx.supabase.co/functions/v1/send-review-requests \
  -H "Authorization: Bearer <service_role_key>"

# Dry run (testing)
curl -X POST https://xxx.supabase.co/functions/v1/send-review-requests \
  -H "Authorization: Bearer <service_role_key>" \
  -d '{"dryRun": true}'

# Contrat spécifique
curl -X POST https://xxx.supabase.co/functions/v1/send-review-requests \
  -H "Authorization: Bearer <service_role_key>" \
  -d '{"contractId": "uuid-here"}'
```

**Intégration** : La fonction `terminateContract()` dans `contractService.ts` appelle automatiquement `sendReviewRequests()` après la résiliation

**Cron job recommandé** : Exécution quotidienne pour les contrats arrivés à terme (end_date passé)

---

### 11. Gestion des Documents Annexes

**Edge Function** : `send-signature-reminders`
**Fonctionnalité** : Envoi automatique de rappels pour les signatures de bails en attente.

**Fonction principales** :

- Récupère tous les contrats en statut `pending_signature`
- Envoie des rappels automatiques à J+3, J+7, et J+14 après l'entrée en statut pending
- Traçabilité des rappels envoyés (timestamp et compteur)
- Support du mode dry-run pour les tests
- Notifications in-app avec lien direct vers la signature

**Tables nécessaires** :

- `lease_contracts` (colonnes ajoutées : `last_signature_reminder`, `signature_reminder_count`)

**Migration** : `20260322140000_add_signature_reminder_tracking.sql`

**Usage** :

```bash
# Production
curl -X POST https://xxx.supabase.co/functions/v1/send-signature-reminders \
  -H "Authorization: Bearer <service_role_key>"

# Dry run (testing)
curl -X POST https://xxx.supabase.co/functions/v1/send-signature-reminders \
  -H "Authorization: Bearer <service_role_key>" \
  -d '{"dryRun": true}'
```

**Cron job recommandé** : Exécution quotidienne à 9h pour vérifier et envoyer les rappels

---

### 12. Gestion des Documents Annexes

**Description** : Permet d'uploader et gérer les documents liés au contrat (assurance habitation, justificatifs, etc.)

**Fonctions à implémenter** :

- Upload de documents avec validation (taille, format)
- Types de documents : assurance habitation, justificatif de domicile, justificatif de revenus, etc.
- Historique des documents avec dates d'ajout et suppression
- Validation des fichiers (PDF, JPG, PNG, etc.)

**Tables nécessaires** :

- `contract_documents` (colonnes : id, contract_id, document_type, file_url, file_name, uploaded_at, uploaded_by)

---

### 13. Modèles de Contrats Personnalisables

**Description** : Permet de créer et gérer des modèles de contrats personnalisés.

**Fonctions à implémenter** :

- Création de modèles avec variables dynamiques
- Bibliothèque de clauses prédéfinies
- Aperçu du modèle avec génération de PDF
- Sauvegarde et gestion des modèles personnalisés

**Tables nécessaires** :

- `contract_templates` (colonnes : id, owner_id, template_name, template_content, variables, created_at, updated_at)

---

### 14. Vérification de Conformité Légale

**Description** : Vérifie automatiquement la conformité du contrat selon le droit ivoirien.

**Fonctions à implémenter** :

- Liste des points de contrôle légaux requis
- Validation automatique du contrat contre ces points
- Indicateurs visuels de conformité (✅ conforme, ⚠️ avertissements, ❌ non conforme)
- Génération d'un rapport de conformité

**Tables nécessaires** :

- `contract_compliance_checks` (colonnes : id, contract_id, check_point, status, details, checked_at)

---

### 15. Archivage Automatique des Contrats Expirés

**Description** : Archive automatiquement les contrats expirés.

**Fonctions à implémenter** :

- Tâche planifiée pour archiver automatiquement les contrats expirés
- Changement de statut automatique (actif → archivé ou expiré)
- Notification aux parties concernées
- Conservation de l'historique et des documents
- Section "Contrats archivés" dans l'interface

**Tables nécessaires** :

- `lease_contracts` (colonne `status` déjà existante, valeurs possibles : 'archivé', 'expiré')

---

### 16. Messagerie Spécifique à Chaque Contrat

**Description** : Système de messagerie intégré dans chaque contrat.

**Fonctions à implémenter** :

- Système de messagerie par contrat
- Historique des messages par contrat
- Envoi de notifications pour les nouveaux messages
- Liaison avec le système de notifications existant

**Tables nécessaires** :

- `contract_messages` (colonnes : id, contract_id, sender_id, recipient_id, message, sent_at, read_at)

---

### 17. Système de Notifications Automatiques pour les Échéances

**Description** : Notifications automatiques pour les échéances contractuelles.

**Fonctions à implémenter** :

- Notifications pour les échéances de contrat (fin de bail, paiement de loyer, renouvellement, état des lieux)
- Fréquence configurable (ex: 7 jours avant, 1 jour avant)
- Canaux de notification (in-app, email, SMS)
- Gestion des préférences de notification par utilisateur

**Tables nécessaires** :

- `notifications` (colonnes existantes : id, user_id, title, message, type, action_url, channel, created_at)
- `notification_preferences` (colonnes : id, user_id, notification_type, enabled, channel, lead_time_days)

---

### 18. Rappels Automatiques pour les Renouvellements

**Description** : Envoi automatique de rappels pour les renouvellements en attente.

**Fonctions à implémenter** :

- Calcul automatique des dates de rappel basé sur la date de fin de bail
- Rappels multiples (30 jours, 7 jours, 1 jour avant)
- Historique des rappels envoyés
- Intégration avec le système de notifications

**Tables nécessaires** :

- `renewal_reminders` (colonnes : id, renewal_id, reminder_date, reminder_type, status, sent_at)

---

### 19. Mode Comparaison pour Visualiser Plusieurs Contrats

**Description** : Interface de comparaison côte à côte de plusieurs contrats.

**Fonctions à implémenter** :

- Sélection de 2 à 4 contrats à comparer
- Affichage côte à côte des différences
- Mise en évidence des différences significatives
- Export du tableau comparatif

**Interface prévue** :

- Interface de comparaison avec grille de contrats
- Affichage des différences (loyer, durée, conditions, garanties, etc.)
- Indicateurs visuels pour les différences

---

### 20. Export de Données (Excel, CSV) pour la Comptabilité

**Description** : Export des données contractuelles pour la comptabilité.

**Fonctions à implémenter** :

- Bouton d'export dans la page "Mes contrats"
- Génération de fichiers Excel/CSV avec toutes les données contractuelles
- Sélection des colonnes à exporter
- Filtrage par période (année, mois, trimestre)
- Formatage des devises et dates

**Interface prévue** :

- Bouton "Exporter les données"
- Sélecteur de format (Excel, CSV)
- Sélecteur de période
- Sélecteur de colonnes
- Téléchargement du fichier généré

---

### 21. Recherche Avancée avec Plus de Filtres

**Description** : Recherche avancée avec filtres multiples.

**Fonctions à implémenter** :

- Filtres avancés : par statut, par période, par montant de loyer, par propriété, par locataire
- Opérateurs de recherche (contient, commence par, égal à)
- Tri personnalisable (par date, par montant, par statut)
- Sauvegarde des recherches favorites

**Interface prévue** :

- Barre de recherche avec filtres avancés
- Opérateurs de recherche
- Options de tri
- Sauvegarde des filtres

---

### 22. Vue Calendrier des Échéances Contractuelles

**Description** : Vue calendrier mensuelle/annuelle des échéances.

**Fonctions à implémenter** :

- Vue calendrier mensuelle/annuelle
- Types d'événements : fin de bail, paiement de loyer, renouvellement, état des lieux
- Indicateurs visuels sur le calendrier (couleur par type d'événement)
- Navigation entre les périodes
- Détail d'une échéance au clic

**Interface prévue** :

- Composant calendrier avec vue mensuelle/annuelle
- Indicateurs visuels par type d'événement
- Navigation entre les périodes
- Modal de détail d'une échéance

---

### 23. Historique des Modifications des Contrats

**Description** : Système d'audit trail pour chaque contrat.

**Fonctions à implémenter** :

- Liste chronologique de toutes les modifications
- Détails de chaque modification : qui, quand, quoi (ancien → nouveau), raison
- Possibilité de voir les différences avant/après
- Export de l'historique

**Tables nécessaires** :

- `contract_modifications` (colonnes : id, contract_id, modified_by, modified_at, field_name, old_value, new_value, reason)

---

### 24. Gestion des Avenants (Modifications en Cours de Bail)

**Description** : Création et gestion des avenants pour modifier les contrats en cours de bail.

**Fonctions à implémenter** :

- Types d'avenants : augmentation de loyer, modification des conditions, prolongation de durée, etc.
- Workflow de création et signature de l'avenant
- Intégration avec les notifications pour les avenants
- Historique des avenants par contrat

**Tables nécessaires** :

- `contract_amendments` (colonnes : id, contract_id, amendment_type, description, effective_date, status, created_at, updated_at)

---

## Tables de Base de Données Nécessaires

### Tables existantes

- `lease_contracts` - Contrats de location
- `electronic_signature_logs` - Logs des signatures électroniques
- `profiles` - Profils utilisateurs
- `properties` - Propriétés
- `notifications` - Notifications

### Tables à créer

1. `rent_payments` - Paiements de loyer
2. `rent_indexations` - Indexations de loyer
3. `lease_renewals` - Renouvellements de baux
4. `departure_notices` - Préavis de départ
5. `inventory_reports` - États des lieux
6. `contract_documents` - Documents annexes
7. `contract_templates` - Modèles de contrats
8. `contract_compliance_checks` - Vérifications de conformité
9. `contract_messages` - Messages par contrat
10. `notification_preferences` - Préférences de notifications
11. `renewal_reminders` - Rappels de renouvellement
12. `contract_modifications` - Historique des modifications
13. `contract_amendments` - Avenants

### Colonnes à ajouter à `lease_contracts`

- `deposit_status` - Statut du dépôt (held, released, partial, deducted)
- `deposit_release_date` - Date de libération du dépôt
- `deposit_deduction_amount` - Montant déduit du dépôt
- `deposit_deduction_reason` - Raison de la déduction
- `last_indexation_date` - Date de la dernière indexation

---

## Architecture des Services

```
src/services/contracts/
├── index.ts                    # Export principal de tous les services
├── contractService.ts            # Service de gestion des contrats (existant)
├── signatureService.ts           # Service de signature numérique (créé)
├── rentPaymentService.ts         # Service des paiements de loyer (créé)
├── depositService.ts             # Service du dépôt de garantie (créé)
└── rentIndexationService.ts       # Service d'indexation automatique (créé)
```

---

## Intégration dans l'Interface "Mes contrats"

Les services sont intégrés dans [`OwnerContractsPage.tsx`](../../pages/owner/OwnerContractsPage.tsx:1) avec les sections suivantes :

1. **Tableau de bord** - Statistiques globales
2. **Liste des contrats** - Avec filtres et recherche
3. **Baux expirant prochainement** - Alert avec compteur
4. **Demandes de renouvellement** - Liste et modal de création
5. **Préavis de départ** - Liste et modal de création
6. **États des lieux** - Section avec boutons de création

---

## Prochaines Étapes

1. ✅ Créer les tables de base de données nécessaires
2. ✅ Implémenter les services créés dans l'interface
3. ⏳ Tester l'ensemble des fonctionnalités
4. ⏳ Documenter l'utilisation des services

---

## Notes Importantes

- Tous les services utilisent Supabase comme base de données
- Les fonctions d'indexation respectent la législation ivoirienne (5% par an)
- Le système de signature utilise Canvas API pour la signature tactile/souris
- Les notifications utilisent le système de notifications existant
- Les services sont conçus pour être réutilisables dans d'autres parties de l'application
