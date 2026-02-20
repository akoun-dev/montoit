# Roadmap Locataire - MonToit Platform

## Vue d'ensemble

Cette roadmap décrit l'ensemble des fonctionnalités, parcours utilisateur, et évolutions prévues pour l'espace locataire de la plateforme MonToit. Elle sert de référence pour le développement, les tests, et la documentation.

**Dernière mise à jour** : 13 février 2026  
**Version** : 3.2.2  
**Public cible** : Locataires recherchant ou gérant un logement en Côte d'Ivoire

---

## Table des matières

1. [Parcours utilisateur](#parcours-utilisateur)
2. [Fonctionnalités principales](#fonctionnalités-principales)
3. [Architecture technique](#architecture-technique)
4. [Services et intégrations](#services-et-intégrations)
5. [Sécurité et conformité](#sécurité-et-conformité)
6. [Roadmap d'évolution](#roadmap-dévolution)
7. [Métriques et KPI](#métriques-et-kpi)
8. [Documentation technique](#documentation-technique)

---

## Parcours utilisateur

### 1. Inscription et onboarding

- **Inscription basique** : Email/mot de passe ou OAuth
- **Vérification email** : Lien de confirmation
- **Sélection du profil** : Locataire, Propriétaire, Agence
- **Complétion du profil** : Informations personnelles, préférences
- **Vérification d'identité** : Optionnelle pour certaines fonctionnalités

### 2. Recherche de logement

- **Recherche simple** : Barre de recherche avec suggestions
- **Recherche avancée** : Filtres (prix, localisation, type, équipements)
- **Carte interactive** : Visualisation géographique des biens
- **Alertes de recherche** : Notifications pour nouveaux biens correspondants
- **Favoris** : Sauvegarde des biens intéressants

### 3. Candidature

- **Consultation détaillée** : Photos, description, équipements, localisation
- **Pré-candidature** : Expression d'intérêt rapide
- **Candidature complète** : Formulaire avec pièces jointes (CNI, justificatifs)
- **Suivi de candidature** : État (en attente, acceptée, refusée)
- **Messagerie intégrée** : Échanges avec propriétaire/agence

### 4. Signature du bail

- **Génération du contrat** : PDF personnalisé avec clauses
- **Prévisualisation** : Lecture du contrat avant signature
- **Signature électronique** : Via CryptoNeo ou manuelle
- **Téléchargement** : Contrat signé archivé
- **Paiement du dépôt** : Optionnel selon configuration

### 5. Vie locative

- **Tableau de bord** : Vue d'ensemble du contrat, paiements, échéances
- **Paiement du loyer** : Mobile Money, carte bancaire, virement
- **Historique des paiements** : Reçus et justificatifs
- **Demandes d'entretien** : Signalement de problèmes
- **Communication** : Messagerie avec propriétaire/agence
- **Renouvellement** : Gestion de fin de contrat

### 6. Fin de contrat

- **Préavis** : Notification des dates de fin
- **État des lieux** : Rapport numérique
- **Remboursement dépôt** : Suivi et réclamation
- **Avis et évaluation** : Notation du propriétaire/logement

---

## Fonctionnalités principales

### Recherche et découverte

- **Recherche multi-critères** : Prix, surface, localisation, type, équipements
- **Carte interactive** : Mapbox/Google Maps avec clustering
- **Filtres avancés** : Proximité écoles/transports, sécurité, énergie
- **Alertes personnalisées** : Notifications push/email pour nouveaux biens
- **Historique de recherche** : Suggestions basées sur comportement
- **Comparaison** : Side-by-side de plusieurs biens

### Gestion de candidatures

- **Portfolio numérique** : Profil locataire avec documents
- **Candidature rapide** : Pré-remplissage avec profil
- **Documents requis** : CNI, bulletins de salaire, garanties
- **Statut en temps réel** : Suivi étape par étape
- **Notifications** : Mises à jour par email/SMS
- **Renouvellement automatique** : Candidature pour nouveaux biens similaires

### Contrats et documents

- **Génération de contrat** : PDF avec clauses personnalisables
- **Signature électronique** : Intégration CryptoNeo
- **Archivage sécurisé** : Stockage cloud avec accès contrôlé
- **Partage de documents** : Propriétaire, agence, tiers
- **Notifications légales** : Rappels échéances, renouvellements
- **Modèles de clauses** : Bibliothèque de clauses standards

### Paiements et finances

- **Paiement du loyer** : Mobile Money (Orange Money, MTN Moov)
- **Paiement récurrent** : Prélèvement automatique
- **Historique complet** : Reçus, justificatifs, export
- **Alertes de paiement** : Rappels avant échéance
- **Litiges financiers** : Signalement de problèmes
- **Indexation** : Calcul automatique selon indice INSEE

### Maintenance et entretien

- **Signalement de problèmes** : Catégorisation (urgence, normal)
- **Suivi des interventions** : Statut, photos, commentaires
- **Communication** : Messagerie avec propriétaire/intervenant
- **Historique des demandes** : Archives des interventions
- **Évaluation** : Notation de la résolution
- **Coûts partagés** : Gestion des frais d'entretien

### Communication

- **Messagerie intégrée** : Discussions avec propriétaires/agences
- **Notifications push** : Mises à jour importantes
- **Email automatisés** : Confirmations, rappels
- **SMS** : Alertes urgentes (optionnel)
- **Chatbot IA** : Assistance 24/7 pour questions fréquentes
- **Appels vocaux** : Intégration téléphonique (futur)

### Profil et compte

- **Profil complet** : Informations personnelles, professionnelles
- **Vérification d'identité** : ONECI, CNAM, vérification faciale
- **Préférences** : Critères de recherche, notifications
- **Sécurité** : 2FA, gestion des sessions
- **Export de données** : RGPD compliance
- **Suppression de compte** : Procédure avec archivage

---

## Architecture technique

### Stack frontend

- **Framework** : React 18 + TypeScript
- **Build tool** : Vite 7.3
- **Styling** : Tailwind CSS 3.4 + Radix UI
- **State management** : Zustand (global) + TanStack Query (server)
- **Routing** : React Router 7
- **Maps** : Mapbox GL + React Google Maps
- **PDF generation** : jsPDF + html2pdf.js
- **Charts** : Recharts

### Services backend (Supabase)

- **Base de données** : PostgreSQL avec RLS
- **Authentification** : JWT, OAuth, MFA
- **Stockage** : S3-like pour documents
- **Realtime** : Websockets pour notifications
- **Edge Functions** : Serverless functions (Deno)

### Services externes

- **Paiements** : Intouch (Mobile Money)
- **Signature électronique** : CryptoNeo
- **Vérification d'identité** : ONECI API, CNAM
- **Cartographie** : Mapbox, Google Maps
- **Notifications** : Resend (email), Azure SMS
- **IA/chatbot** : Azure OpenAI
- **Monitoring** : Sentry, Google Analytics 4

### Structure des données principales

#### Tables clés pour locataire

```sql
-- Profil utilisateur
profiles (id, user_id, role, full_name, email, phone, verified)

-- Biens immobiliers
properties (id, title, description, price, location, coordinates)

-- Candidatures
tenant_applications (id, property_id, tenant_id, status, documents)

-- Contrats de bail
lease_contracts (id, property_id, tenant_id, owner_id, terms, status)

-- Paiements
payments (id, contract_id, amount, method, status, date)

-- Demandes d'entretien
maintenance_requests (id, property_id, tenant_id, description, status)

-- Messages
messages (id, sender_id, receiver_id, content, read)
```

---

## Services et intégrations

### Service de paiement

- **Intouch Payment Service** : Mobile Money CI
- **Recurring Payment Service** : Paiements automatiques
- **Payment History Service** : Historique et reçus
- **Alert Service** : Rappels avant échéance

### Service de contrats

- **Contract PDF Generator** : Génération de PDF
- **Signature Service** : Intégration CryptoNeo
- **Contract Templates** : Modèles personnalisables
- **Deposit Service** : Gestion des dépôts de garantie

### Service de vérification

- **ONECI Service** : Vérification d'identité nationale
- **CNAM Verification** : Vérification sécurité sociale
- **Biometric Verification** : Vérification faciale
- **Document Validation** : Validation des pièces jointes

### Service de notifications

- **Application Notification Service** : Candidatures
- **Lease Notification Service** : Contrats et paiements
- **Mandate Notification Service** : Mandats d'agence
- **Multi-channel** : Email, SMS, push, in-app

### Service d'IA

- **Chatbot Service** : Assistance conversationnelle
- **Document Processing** : OCR pour pièces jointes
- **Recommendation Engine** : Suggestions de biens
- **Risk Assessment** : Évaluation des candidatures

---

## Sécurité et conformité

### Authentification et autorisation

- **Multi-factor authentication** : SMS, email, app authenticator
- **Role-Based Access Control** : Rôles locataire/propriétaire/agence/admin
- **Row Level Security** : Isolation des données par utilisateur
- **Session management** : Revocation, expiration, monitoring

### Protection des données

- **Chiffrement** : Données sensibles au repos et en transit
- **Anonymisation** : Données pour analytics
- **Backup automatique** : Rétention 30 jours
- **GDPR/CNIL compliance** : Droit à l'oubli, portabilité

### Sécurité des paiements

- **PCI DSS compliance** : Via processeur de paiement tiers
- **Tokenisation** : Pas de stockage de données bancaires
- **Audit trail** : Traçabilité complète des transactions
- **Fraud detection** : Patterns suspects, blocage automatique

### Conformité légale

- **Contrats légaux** : Conformité droit ivoirien
- **Conservation des documents** : 10 ans minimum
- **Litiges** : Médiation intégrée avec Trust Agents
- **Transparence** : Frais et commissions clairement affichés

---

## Roadmap d'évolution

### Phase 1 : Fonctionnalités de base (✓ Complété)

- [x] Inscription/connexion locataire
- [x] Recherche de biens avec filtres
- [x] Système de favoris
- [x] Candidature simple
- [x] Messagerie basique
- [x] Tableau de bord locataire

### Phase 2 : Vie locative (✓ Complété)

- [x] Contrats PDF générés
- [x] Paiement Mobile Money
- [x] Demandes d'entretien
- [x] Notifications push/email
- [x] Profil complet avec documents
- [x] Historique des paiements

### Phase 3 : Avancé (🔄 En cours)

- [ ] Signature électronique intégrée
- [ ] Paiements récurrents automatiques
- [ ] Vérification d'identité ONECI
- [ ] Chatbot IA pour assistance
- [ ] Application mobile native
- [ ] Système de scoring locataire

### Phase 4 : Excellence (📅 Planifié Q2 2026)

- [ ] Réputation et avis détaillés
- [ ] Assurance habitation intégrée
- [ ] Services additionnels (nettoyage, réparation)
- [ ] Portefeuille numérique des documents
- [ ] Intelligence prédictive (prix, disponibilité)
- [ ] Intégration services publics (eau, électricité)

### Phase 5 : Innovation (📅 Planifié H2 2026)

- [ ] Visites virtuelles 3D
- [ ] Contrats intelligents (blockchain)
- [ ] Marketplace locative (meubles, équipements)
- [ ] Communauté de locataires
- [ ] Analytics personnalisés (budget, consommation)
- [ ] Intégration domotique (smart home)

---

## Métriques et KPI

### Métriques utilisateur

- **Taux d'inscription** : > 30% des visiteurs
- **Taux d'abandon candidature** : < 20%
- **Temps moyen de recherche** : < 15 minutes
- **Satisfaction utilisateur** : NPS > 40
- **Retention mensuelle** : > 70%

### Métriques techniques

- **Temps de chargement page** : < 2 secondes
- **Disponibilité** : 99.9% uptime
- **Erreurs** : < 0.1% des requêtes
- **Performance mobile** : Lighthouse score > 90
- **Taille bundle** : < 500KB initial

### Métriques business

- **Nombre de candidatures** : Croissance mensuelle 15%
- **Taux de conversion** : Recherche → Candidature > 5%
- **Paiements réussis** : > 95% des transactions
- **Réduction litiges** : < 2% des contrats
- **Coût d'acquisition** : < 5€ par locataire actif

---

## Documentation technique

### Pour les développeurs

- **API Documentation** : Swagger/OpenAPI pour services externes
- **Component Library** : Storybook pour UI components
- **Database Schema** : Diagrammes ERD et migrations
- **Deployment Guide** : Vercel, Docker, manuel
- **Testing Strategy** : Unit, integration, e2e, security

### Pour les utilisateurs

- **User Guide** : Documentation pas-à-pas
- **FAQ** : Questions fréquentes
- **Video Tutorials** : Screencasts des fonctionnalités
- **Support Channels** : Email, chat, téléphone
- **Legal Documentation** : CGU, politique de confidentialité

### Pour les partenaires

- **API Partner Guide** : Intégration tierce
- **Webhook Documentation** : Événements et payloads
- **Compliance Checklist** : Exigences légales
- **Brand Guidelines** : Utilisation du logo, couleurs

---

## Conclusion

Cette roadmap représente la vision complète de l'expérience locataire sur MonToit. Elle évoluera en fonction des retours utilisateurs, des avancées technologiques, et des besoins du marché immobilier ivoirien.

**Prochaines étapes immédiates** :

1. Finaliser l'intégration ONECI
2. Améliorer l'expérience mobile
3. Optimiser les performances de recherche
4. Déployer le système de scoring

**Contacts** :

- Développement : dev@montoit.ci
- Support : support@montoit.ci
- Partenariats : partnerships@montoit.ci

---

_Document maintenu par l'équipe technique MonToit - ANSUT_
