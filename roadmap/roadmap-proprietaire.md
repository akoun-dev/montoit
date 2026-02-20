# Roadmap Propriétaire - MonToit Platform

## Vue d'ensemble

Cette roadmap décrit l'ensemble des fonctionnalités, parcours utilisateur, et évolutions prévues pour l'espace propriétaire de la plateforme MonToit. Elle sert de référence pour le développement, les tests, et la documentation.

**Dernière mise à jour** : 13 février 2026  
**Version** : 3.2.2  
**Public cible** : Propriétaires immobiliers gérant un ou plusieurs biens en Côte d'Ivoire

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

### 1. Inscription et validation

- **Inscription basique** : Email/mot de passe ou OAuth
- **Vérification email** : Lien de confirmation
- **Sélection du profil** : Propriétaire (individuel ou professionnel)
- **Complétion du profil** : Informations personnelles, coordonnées bancaires
- **Vérification d'identité** : Obligatoire pour publier des biens (CNI, justificatif de propriété)
- **Validation par Trust Agent** : Vérification manuelle pour certains biens

### 2. Publication de biens

- **Formulaire de publication** : Description détaillée, caractéristiques, équipements
- **Géolocalisation** : Capture GPS ou sélection sur carte
- **Galerie photos** : Upload multiple, compression automatique
- **Prix et conditions** : Loyer, charges, dépôt de garantie, conditions
- **Validation automatique** : Vérification des champs obligatoires
- **Publication** : Mise en ligne avec statut (brouillon, publié, archivé)

### 3. Gestion des candidatures

- **Réception des candidatures** : Notification pour chaque nouvelle candidature
- **Consultation des dossiers** : Profil locataire, documents, score
- **Pré-sélection** : Filtrage, comparaison, notation
- **Communication** : Messagerie intégrée avec candidats
- **Décision** : Acceptation, refus, mise en attente
- **Historique** : Archive des candidatures traitées

### 4. Signature du bail

- **Génération du contrat** : PDF personnalisé avec clauses standards ou personnalisées
- **Configuration des termes** : Durée, loyer, indexation, conditions spéciales
- **Envoi au locataire** : Notification pour signature
- **Signature électronique** : Double signature (propriétaire + locataire)
- **Archivage** : Stockage sécurisé avec accès partagé
- **Notification aux parties** : Confirmation de signature

### 5. Gestion locative

- **Tableau de bord** : Vue d'ensemble des biens, contrats, paiements
- **Suivi des paiements** : Visualisation des loyers payés/en retard
- **Communication** : Messagerie avec locataires
- **Demandes d'entretien** : Réception et gestion des demandes
- **États des lieux** : Numérisation des états d'entrée/sortie
- **Renouvellement** : Gestion automatique des fins de contrat

### 6. Fin de contrat et sortie

- **Gestion du préavis** : Notifications automatiques
- **État des lieux de sortie** : Rapport numérique avec photos
- **Remboursement dépôt** : Calcul des retenues, virement
- **Archivage du dossier** : Conservation légale (10 ans)
- **Avis et évaluation** : Notation du locataire
- **Remise sur le marché** : Reprogrammation rapide du bien

### 7. Gestion des mandats

- **Création de mandat** : Délégation à une agence immobilière
- **Configuration** : Durée, commission, périmètre d'action
- **Signature électronique** : Via CryptoNeo
- **Suivi des activités** : Actions réalisées par l'agence
- **Résiliation** : Procédure de fin de mandat
- **Historique** : Archive des mandats passés

---

## Fonctionnalités principales

### Gestion du portefeuille

- **Ajout de biens** : Formulaire complet avec géolocalisation
- **Édition et mise à jour** : Modification des caractéristiques, prix, statut
- **Suppression/archivage** : Retrait temporaire ou définitif
- **Visualisation carte** : Carte interactive de tous les biens
- **Statistiques par bien** : Vues, candidatures, performance
- **Import/export** : CSV pour mise à jour en masse

### Publication et visibilité

- **Optimisation SEO** : Description structurée pour moteurs de recherche
- **Photos haute qualité** : Compression automatique, galerie organisée
- **Visites virtuelles** : Option 360° (futur)
- **Promotion** : Mise en avant payante, boost de visibilité
- **Partage** : Liens vers réseaux sociaux, embed code
- **Analytics** : Nombre de vues, temps de consultation, origine

### Gestion des candidatures

- **Tableau de bord candidatures** : Vue consolidée par bien
- **Filtres avancés** : Statut, date, score locataire
- **Notation manuelle** : Système d'étoiles, commentaires internes
- **Communication groupée** : Envoi de messages à plusieurs candidats
- **Modèles de réponse** : Réponses pré-rédigées (refus, demande d'info)
- **Workflow personnalisable** : Étapes de traitement configurables

### Contrats et documents

- **Générateur de contrat** : PDF avec mise en page professionnelle
- **Bibliothèque de clauses** : Clauses légales pré-approuvées
- **Personnalisation** : Ajout de clauses spécifiques
- **Signature électronique** : Intégration CryptoNeo (légalement valide)
- **Stockage sécurisé** : Cloud avec chiffrement, accès contrôlé
- **Partage sécurisé** : Liens temporaires avec mot de passe
- **Renouvellement automatique** : Génération de avenants

### Paiements et comptabilité

- **Suivi des loyers** : Tableau des échéances, paiements reçus
- **Alertes retard** : Notifications pour paiements en retard
- **Reçus de loyer** : Génération automatique de quittances
- **Rapports financiers** : Revenus, charges, taxes
- **Export comptable** : Fichiers compatibles logiciels de comptabilité
- **Intégration bancaire** : Virements automatiques (futur)
- **Gestion des charges** : Répartition, régularisation

### Maintenance et entretien

- **Portail demandes** : Interface unique pour toutes les demandes
- **Catégorisation** : Urgence, entretien, amélioration
- **Assignation** : À soi-même ou à un prestataire
- **Suivi des coûts** : Budget, factures, justificatifs
- **Calendrier des interventions** : Vue mensuelle/annuelle
- **Historique complet** : Archives des interventions par bien

### Communication

- **Messagerie intégrée** : Discussions avec locataires, agences, candidats
- **Notifications push** : Alertes importantes (paiement, demande, message)
- **Email automatisés** : Confirmations, rappels, relances
- **SMS** : Pour urgences ou locataires sans email
- **Chatbot IA** : Assistance pour questions fréquentes
- **Appels vocaux** : Intégration téléphonique (futur)

### Mandats d'agence

- **Création de mandat** : Formulaire avec conditions négociées
- **Recherche d'agences** : Annuaire des agences partenaires
- **Comparaison** : Commissions, services, avis
- **Signature électronique** : Double signature sécurisée
- **Suivi des performances** : Statistiques de l'agence
- **Résiliation** : Procédure encadrée, notification

### Profil et compte

- **Profil professionnel** : Informations personnelles et professionnelles
- **Vérification d'identité** : CNI, justificatif de propriété
- **Coordonnées bancaires** : Pour virements sécurisés
- **Préférences** : Notifications, langue, devise
- **Sécurité** : 2FA, gestion des sessions, historique de connexion
- **Export de données** : Conformité RGPD
- **Suppression de compte** : Procédure avec archivage légal

---

## Architecture technique

### Stack frontend

- **Framework** : React 18 + TypeScript
- **Build tool** : Vite 7.3
- **Styling** : Tailwind CSS 3.4 + Radix UI
- **State management** : Zustand (global) + TanStack Query (server)
- **Routing** : React Router 7
- **Maps** : Mapbox GL + React Google Maps
- **PDF generation** : jsPDF + html2pdf.js + contract templates
- **Charts** : Recharts pour dashboard financier
- **File upload** : UploadService avec compression d'images

### Services backend (Supabase)

- **Base de données** : PostgreSQL avec RLS (Row Level Security)
- **Authentification** : JWT, OAuth, MFA
- **Stockage** : S3-like pour documents, photos, contrats
- **Realtime** : Websockets pour notifications en direct
- **Edge Functions** : Serverless functions pour génération PDF, notifications

### Services externes

- **Paiements** : Intouch (Mobile Money) pour dépôts
- **Signature électronique** : CryptoNeo pour mandats et contrats
- **Vérification d'identité** : ONECI API, CNAM
- **Cartographie** : Mapbox, Google Maps pour géolocalisation
- **Notifications** : Resend (email), Azure SMS
- **IA/chatbot** : Azure OpenAI pour assistance
- **Monitoring** : Sentry, Google Analytics 4
- **Compression d'images** : Browser-image-compression côté client

### Structure des données principales

#### Tables clés pour propriétaire

```sql
-- Profil propriétaire
profiles (id, user_id, role, full_name, company_name, tax_id, verified)

-- Biens immobiliers
properties (id, owner_id, title, description, price, location, coordinates, status)

-- Candidatures locataires
tenant_applications (id, property_id, tenant_id, status, documents, score)

-- Contrats de bail
lease_contracts (id, property_id, owner_id, tenant_id, terms, status, signed_pdf_url)

-- Paiements
payments (id, contract_id, amount, method, status, due_date, paid_date)

-- Demandes d'entretien
maintenance_requests (id, property_id, tenant_id, description, priority, status)

-- Mandats d'agence
agency_mandates (id, property_id, owner_id, agency_id, terms, commission, status)

-- Documents
documents (id, property_id, type, file_url, uploaded_by, created_at)
```

---

## Services et intégrations

### Service de propriétés

- **Property Management Service** : CRUD des biens, statuts, géolocalisation
- **Image Processing Service** : Compression, redimensionnement, watermark
- **SEO Service** : Optimisation des descriptions pour le référencement
- **Analytics Service** : Suivi des vues, performances, conversion

### Service de candidatures

- **Application Management Service** : Réception, traitement, décision
- **Scoring Service** : Calcul du score locataire (revenus, historique, documents)
- **Notification Service** : Alertes nouvelles candidatures, rappels
- **Document Validation Service** : Vérification des pièces jointes

### Service de contrats

- **Contract PDF Generator** : Génération de PDF avec données dynamiques
- **Signature Service** : Intégration CryptoNeo pour signature électronique
- **Contract Templates Service** : Gestion des modèles de clauses
- **Deposit Service** : Gestion des dépôts de garantie
- **Rent Indexation Service** : Calcul automatique de l'indexation

### Service de paiements

- **Payment Tracking Service** : Suivi des échéances, retards
- **Receipt Generation Service** : Création de quittances PDF
- **Alert Service** : Notifications avant échéance, relances
- **Accounting Export Service** : Export vers formats comptables

### Service de maintenance

- **Maintenance Request Service** : Création, assignation, suivi
- **Vendor Management Service** : Gestion des prestataires (futur)
- **Cost Tracking Service** : Suivi des dépenses d'entretien
- **Calendar Service** : Planification des interventions

### Service de mandats

- **Mandate Management Service** : Création, signature, suivi des mandats
- **Agency Directory Service** : Recherche et comparaison d'agences
- **Commission Calculator** : Calcul des commissions selon les termes
- **Performance Analytics** : Suivi des résultats de l'agence

### Service de notifications

- **Multi-channel Notification Service** : Email, SMS, push, in-app
- **Template Management** : Modèles personnalisables par type de notification
- **Delivery Tracking** : Suivi des ouvertures, clics
- **Priority Queue** : Gestion des priorités (urgent, normal, bas)

---

## Sécurité et conformité

### Authentification et autorisation

- **Multi-factor authentication** : SMS, email, app authenticator
- **Role-Based Access Control** : Rôles propriétaire, property_manager, admin
- **Row Level Security** : Isolation stricte des données par propriétaire
- **Session management** : Revocation, expiration, monitoring des connexions
- **API rate limiting** : Protection contre les abus

### Protection des données

- **Chiffrement** : Données sensibles au repos (PII, coordonnées bancaires)
- **Chiffrement en transit** : TLS 1.3 pour toutes les communications
- **Anonymisation** : Données analytics anonymisées
- **Backup automatique** : Rétention 30 jours avec restauration ponctuelle
- **GDPR/CNIL compliance** : Droit à l'oubli, portabilité, consentement

### Sécurité des documents

- **Watermarking** : Marquage des documents PDF avec identifiant
- **Accès contrôlé** : Liens signés avec expiration pour les documents partagés
- **Audit trail** : Traçabilité complète des accès aux documents
- **Chiffrement des fichiers** : Stockage chiffré pour documents sensibles

### Conformité légale

- **Contrats conformes** : Droit ivoirien de la location
- **Clauses légales** : Validation par avocats partenaires
- **Conservation** : 10 ans minimum pour contrats et documents comptables
- **Transparence** : Affichage obligatoire des commissions, frais
- **Litiges** : Médiation intégrée avec Trust Agents
- **Protection dépôt** : Compte séquestre pour dépôts de garantie (futur)

### Sécurité financière

- **PCI DSS compliance** : Via processeur de paiement tiers (Intouch)
- **Tokenisation** : Pas de stockage de données bancaires sensibles
- **Validation des virements** : Vérification IBAN/RIB avant virement
- **Audit financier** : Traçabilité complète de toutes les transactions
- **Fraud detection** : Détection de patterns suspects, blocage automatique

---

## Roadmap d'évolution

### Phase 1 : Fonctionnalités de base (✓ Complété)

- [x] Inscription/connexion propriétaire
- [x] Publication de biens avec géolocalisation
- [x] Gestion des candidatures basique
- [x] Génération de contrats PDF
- [x] Messagerie avec locataires/candidats
- [x] Tableau de bord propriétaire

### Phase 2 : Gestion locative avancée (✓ Complété)

- [x] Suivi des paiements et alertes retard
- [x] Demandes d'entretien avec suivi
- [x] États des lieux numériques
- [x] Notifications multi-canaux
- [x] Profil propriétaire vérifié
- [x] Export de données financières

### Phase 3 : Professionnalisation (🔄 En cours)

- [ ] Signature électronique des contrats (CryptoNeo)
- [ ] Mandats d'agence avec signature électronique
- [ ] Vérification d'identité propriétaire (CNI, titre de propriété)
- [ ] Chatbot IA pour assistance propriétaire
- [ ] Application mobile native
- [ ] Système de scoring des candidatures

### Phase 4 : Optimisation et automation (📅 Planifié Q2 2026)

- [ ] Paiements récurrents automatiques (prélèvement)
- [ ] Indexation automatique des loyers
- [ ] Gestion des charges et régularisation
- [ ] Calendrier de disponibilité des biens
- [ ] Visites virtuelles 3D des biens
- [ ] Marketplace de prestataires (réparation, nettoyage)

### Phase 5 : Intelligence et écosystème (📅 Planifié H2 2026)

- [ ] Pricing intelligence (suggestion de loyer optimal)
- [ ] Predictive maintenance (anticipation des réparations)
- [ ] Assurance habitation intégrée
- [ ] Portefeuille numérique des documents légaux
- [ ] Intégration services publics (taxes foncières, ordures)
- [ ] API ouverte pour gestionnaires de patrimoine

### Phase 6 : Expansion (📅 Planifié 2027)

- [ ] Gestion multi-propriétés avec équipes
- [ ] Reporting fiscal automatisé
- [ ] Intégration bancaire directe (virements automatiques)
- [ ] Marketplace de financement (rénovation, investissement)
- [ ] Certification "Propriétaire Professionnel"
- [ ] Export international (biens à l'étranger)

---

## Métriques et KPI

### Métriques utilisateur

- **Temps de publication** : < 10 minutes pour un bien complet
- **Taux de réponse aux candidatures** : > 80% sous 48h
- **Satisfaction propriétaire** : NPS > 45
- **Retention mensuelle** : > 85% des propriétaires actifs
- **Taux d'adoption des contrats électroniques** : > 60%

### Métriques techniques

- **Temps de chargement dashboard** : < 1.5 secondes
- **Disponibilité** : 99.95% uptime
- **Erreurs** : < 0.05% des requêtes
- **Performance mobile** : Lighthouse score > 92
- **Taille bundle propriétaire** : < 600KB initial

### Métriques business

- **Nombre de biens publiés** : Croissance mensuelle 20%
- **Taux de location** : > 70% des biens publiés loués sous 30 jours
- **Paiements à temps** : > 90% des loyers payés avant échéance
- **Réduction litiges** : < 1% des contrats avec litige
- **Revenue par propriétaire** : > 50€/mois (futur modèle premium)

### Métriques qualité

- **Qualité des annonces** : Score moyen > 4/5 (complétude, photos)
- **Temps de résolution entretien** : < 72h pour urgences
- **Taux de renouvellement** : > 60% des locataires renouvellent
- **Avis propriétaires** : Note moyenne > 4.2/5
- **Support satisfaction** : CSAT > 90%

---

## Documentation technique

### Pour les développeurs

- **API Documentation** : Swagger/OpenAPI pour services propriétaire
- **Component Library** : Storybook pour UI components propriétaire
- **Database Schema** : Diagrammes ERD spécifiques propriétaire
- **Deployment Guide** : Vercel, Docker, environnement de test
- **Testing Strategy** : Tests unitaires, d'intégration, e2e
- **Security Guidelines** : Bonnes pratiques pour données sensibles

### Pour les utilisateurs (propriétaires)

- **Guide du propriétaire** : Documentation pas-à-pas illustrée
- **FAQ propriétaire** : Questions fréquentes sur publication, gestion
- **Video Tutorials** : Screencasts des fonctionnalités clés
- **Webinaires** : Sessions de formation mensuelles
- **Support dédié** : Email, chat, téléphone pour propriétaires
- **Centre d'aide** : Articles thématiques (fiscalité, législation)

### Pour les partenaires (agences, prestataires)

- **API Partner Guide** : Intégration pour agences immobilières
- **Webhook Documentation** : Événements propriétaire (nouveau bien, candidature)
- **Compliance Checklist** : Exigences pour partenariats
- **Brand Guidelines** : Utilisation du logo, charte graphique
- **Contract Templates** : Modèles de mandats pré-approuvés

### Pour l'équipe interne

- **Admin Documentation** : Gestion des comptes propriétaires
- **Moderation Guidelines** : Validation des biens, modération contenu
- **Support Playbook** : Procédures pour incidents courants
- **Analytics Dashboard** : Tableaux de bord internes de performance
- **Security Protocols** : Procédures de réponse aux incidents

---

## Conclusion

Cette roadmap représente la vision complète de l'expérience propriétaire sur MonToit. Elle évoluera en fonction des retours utilisateurs, des avancées technologiques, et des besoins du marché immobilier ivoirien.

**Prochaines étapes immédiates** :

1. Finaliser l'intégration signature électronique CryptoNeo
2. Déployer le système de mandats d'agence
3. Optimiser le workflow de publication de biens
4. Améliorer le dashboard financier

**Contacts** :

- Développement : dev@montoit.ci
- Support propriétaires : proprietaires@montoit.ci
- Partenariats agences : partenariats@montoit.ci
- Assistance juridique : juridique@montoit.ci

---

_Document maintenu par l'équipe technique MonToit - ANSUT_
