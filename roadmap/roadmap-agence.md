# Roadmap Agence Immobilière - MonToit Platform

## Vue d'ensemble

Cette roadmap décrit l'ensemble des fonctionnalités, parcours utilisateur, et évolutions prévues pour l'espace agence immobilière de la plateforme MonToit. Elle sert de référence pour le développement, les tests, et la documentation.

**Dernière mise à jour** : 13 février 2026  
**Version** : 3.2.2  
**Public cible** : Agences immobilières professionnelles opérant en Côte d'Ivoire

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

- **Demande d'inscription** : Formulaire complet avec informations légales
- **Vérification email** : Lien de confirmation
- **Soumission des documents** : RCCM, attestation fiscale, assurance RC Pro
- **Validation par Trust Agent** : Vérification manuelle des documents
- **Activation du compte** : Notification d'approbation, accès à la plateforme
- **Configuration initiale** : Profil, équipe, préférences

### 2. Acquisition de mandats

- **Recherche de propriétaires** : Annuaire des propriétaires, suggestions
- **Proposition de mandat** : Formulaire avec termes négociables
- **Négociation en ligne** : Messagerie intégrée avec propriétaire
- **Génération du mandat** : PDF personnalisé avec clauses standards
- **Signature électronique** : Double signature (agence + propriétaire) via CryptoNeo
- **Archivage du mandat** : Stockage sécurisé avec accès partagé

### 3. Gestion du portefeuille

- **Ajout de biens** : Pour mandats signés ou biens propres
- **Géolocalisation** : Capture GPS précise, périmètre sur carte
- **Optimisation des annonces** : Photos professionnelles, descriptions structurées
- **Publication multi-canal** : MonToit + sites partenaires (optionnel)
- **Suivi des performances** : Vues, candidatures, contacts
- **Mise à jour des disponibilités** : Statut (disponible, en location, vendu)

### 4. Traitement des candidatures

- **Réception centralisée** : Toutes les candidatures dans un tableau unique
- **Pré-qualification** : Filtrage automatique par critères (revenus, garanties)
- **Communication avec candidats** : Messagerie, emails automatisés
- **Organisation des visites** : Calendrier partagé, confirmations automatiques
- **Sélection finale** : Comparaison des dossiers, recommandation au propriétaire
- **Suivi post-candidature** : Statistiques de conversion, feedback

### 5. Signature des contrats

- **Génération du bail** : PDF avec clauses agence/propriétaire/locataire
- **Coordination des signatures** : Envoi séquentiel ou simultané
- **Signature électronique** : Triple signature (propriétaire, locataire, agence)
- **Archivage légal** : Conservation 10 ans, accès contrôlé
- **Transmission aux parties** : Copies certifiées conformes
- **Suivi des obligations** : Rappels pour état des lieux, dépôt de garantie

### 6. Gestion locative (service optionnel)

- **Interface propriétaire déléguée** : Accès limité pour le propriétaire
- **Suivi des paiements** : Relances, quittances, régularisation charges
- **Gestion des entretiens** : Centralisation des demandes, intervention prestataires
- **Communication avec locataires** : Messagerie dédiée, annonces
- **Renouvellement de bail** : Avenants, renégociation
- **Sortie du locataire** : État des lieux, restitution dépôt, relouage

### 7. Facturation et commissions

- **Calcul automatique** : Commission selon type de mandat (%, fixe, mixte)
- **Génération de factures** : PDF professionnel avec TVA
- **Suivi des paiements** : Échéances, retards, relances
- **Reporting financier** : CA par période, par agent, par type de bien
- **Intégration comptable** : Export vers logiciels de comptabilité
- **Paiement en ligne** : Virement, mobile money, carte (futur)

### 8. Gestion d'équipe

- **Ajout d'agents** : Invitation par email, création de comptes
- **Attribution de biens** : Répartition du portefeuille entre agents
- **Suivi des performances** : Objectifs, réalisations, commissions
- **Formation interne** : Accès à la documentation, tutoriels
- **Permissions différenciées** : Rôles (admin, manager, agent, assistant)
- **Désactivation** : Archivage des comptes agents partants

---

## Fonctionnalités principales

### Gestion des mandats

- **Types de mandats** : Simple, exclusif, semi-exclusif, gestion
- **Modèles personnalisables** : Clauses spécifiques par type de mandat
- **Suivi des durées** : Alertes fin de mandat, renouvellement automatique
- **Performance tracking** : Taux de conversion, délai moyen de location
- **Archivage numérique** : Recherche full-text dans les mandats
- **Partage sécurisé** : Accès limité pour propriétaires

### Gestion du portefeuille

- **Tableau de bord central** : Vue d'ensemble de tous les biens
- **Filtres avancés** : Par statut, type, localisation, agent responsable
- **Carte interactive** : Visualisation géographique avec clustering
- **Import/export** : CSV pour mise à jour en masse
- **Statistiques par bien** : Vues, candidatures, temps de mise en ligne
- **Optimisation SEO** : Suggestions d'amélioration des annonces

### Gestion des candidatures

- **Pipeline visuel** : Tableau Kanban par étape (nouvelle, contactée, visitée, acceptée)
- **Fiche candidat complète** : Profil, documents, historique, notes internes
- **Scoring automatique** : Algorithme d'évaluation des dossiers
- **Communication automatisée** : Templates d'emails/SMS pour chaque étape
- **Calendrier des visites** : Synchronisation avec Google Calendar/Outlook
- **Rapports d'activité** : Nombre de candidatures traitées par agent

### Gestion des contrats

- **Bibliothèque de modèles** : Baux standards, avenants, résiliations
- **Générateur intelligent** : Pré-remplissage avec données propriétaire/locataire/bien
- **Workflow de signature** : Suivi étape par étape, relances automatiques
- **Archivage certifié** : Horodatage, hash de vérification d'intégrité
- **Recherche avancée** : Par date, propriétaire, locataire, bien
- **Notifications légales** : Rappels échéances, renouvellements, indexation

### Gestion financière

- **Calcul de commissions** : Formules configurables (pourcentage, montant fixe, paliers)
- **Facturation automatique** : Génération à la signature ou mensuelle
- **Suivi des encaissements** : Statut (émise, envoyée, payée, en retard)
- **Reporting détaillé** : CA, commissions, charges, bénéfice par période
- **Intégration bancaire** : Réconciliation automatique (futur)
- **Alertes financières** : Seuils de rentabilité, commissions impayées

### Gestion d'équipe

- **Organigramme interactif** : Structure hiérarchique de l'agence
- **Tableau de bord par agent** : Performances, objectifs, commissions
- **Système de permissions** : Contrôle d'accès granulaire par fonction
- **Messagerie interne** : Communication entre agents, partage de dossiers
- **Formation et ressources** : Bibliothèque de documents internes
- **Évaluation des performances** : KPI individuels, feedback, plans d'action

### Analytics et reporting

- **Tableaux de bord personnalisables** : Widgets drag & drop
- **Indicateurs clés** : Taux de vacance, délai moyen de location, prix au m²
- **Analyse comparative** : Performance vs marché, vs autres agences (anonymisé)
- **Prévisions** : Projections de CA, besoins en personnel
- **Export de données** : PDF, Excel, PowerPoint pour présentations
- **Alertes intelligentes** : Détection d'anomalies, opportunités

### Communication et marketing

- **Base de contacts** : Propriétaires, candidats, locataires, partenaires
- **Campagnes email** : Templates professionnels, segmentation, tracking
- **SMS automatisés** : Confirmations de visites, rappels de rendez-vous
- **Générateur de visuels** : Création d'annonces sociales (futur)
- **Intégration réseaux sociaux** : Publication automatique sur Facebook, Instagram
- **Suivi des leads** : Source d'acquisition, parcours client, taux de conversion

### Profil et certification

- **Profil public** : Présentation de l'agence, photos, équipe, valeurs
- **Certifications** : Badges ANSUT, labels qualité, partenariats
- **Avis clients** : Système de notation et commentaires vérifiés
- **Portfolio** : Galerie des biens gérés, témoignages propriétaires
- **Statistiques de performance** : Indicateurs publics (nombre de biens, taux de satisfaction)
- **Badges de confiance** : Vérification documentaire, antériorité

---

## Architecture technique

### Stack frontend

- **Framework** : React 18 + TypeScript
- **Build tool** : Vite 7.3
- **Styling** : Tailwind CSS 3.4 + Radix UI
- **State management** : Zustand (global) + TanStack Query (server)
- **Routing** : React Router 7
- **Maps** : Mapbox GL pour visualisation géographique
- **PDF generation** : jsPDF + html2pdf.js + templates mandats/contrats
- **Charts** : Recharts pour analytics
- **Calendar** : FullCalendar intégration
- **Data grids** : TanStack Table pour tableaux complexes

### Services backend (Supabase)

- **Base de données** : PostgreSQL avec RLS (isolation par agence)
- **Authentification** : JWT, OAuth, MFA pour accès sécurisé
- **Stockage** : S3-like pour documents, photos, contrats, mandats
- **Realtime** : Websockets pour notifications en temps réel
- **Edge Functions** : Serverless functions pour génération PDF, calcul commissions

### Services externes

- **Signature électronique** : CryptoNeo pour mandats et contrats
- **Paiements** : Intouch (Mobile Money) pour commissions (futur)
- **Cartographie** : Mapbox, Google Maps pour géolocalisation
- **Notifications** : Resend (email), Azure SMS, push notifications
- **IA/analytics** : Azure OpenAI pour suggestions, prédictions
- **Monitoring** : Sentry, Google Analytics 4
- **Calendar sync** : Google Calendar API, Outlook Calendar API
- **Document processing** : Tesseract.js pour OCR des documents

### Structure des données principales

#### Tables clés pour agence

```sql
-- Profil agence
agency_profiles (id, user_id, legal_name, trade_name, rccm, tax_id, verified)

-- Équipe
agency_team_members (id, agency_id, user_id, role, permissions, commission_rate)

-- Mandats
agency_mandates (id, property_id, owner_id, agency_id, type, terms, commission, status)

-- Biens gérés
agency_properties (id, property_id, agency_id, assigned_agent_id, status)

-- Candidatures
agency_applications (id, application_id, agency_id, assigned_agent_id, status)

-- Contrats signés
agency_contracts (id, contract_id, agency_id, commission_amount, status)

-- Factures
agency_invoices (id, mandate_id, amount, due_date, status, paid_date)

-- Performances
agency_performance (id, agency_id, period, total_revenue, active_mandates, conversion_rate)
```

---

## Services et intégrations

### Service de mandats

- **Mandate Management Service** : Création, suivi, renouvellement des mandats
- **Signature Service** : Intégration CryptoNeo pour signature électronique
- **Commission Calculator** : Calcul automatique selon type de mandat et termes
- **Alert Service** : Notifications fin de mandat, renouvellement, paiements

### Service de portefeuille

- **Property Portfolio Service** : Gestion centralisée des biens sous mandat
- **Geolocation Service** : Capture et validation des coordonnées GPS
- **Image Optimization Service** : Compression, watermark, galerie organisée
- **Performance Analytics Service** : Suivi des vues, candidatures, conversion

### Service de candidatures

- **Application Pipeline Service** : Workflow Kanban, attribution aux agents
- **Scoring Service** : Évaluation automatique des dossiers candidats
- **Communication Service** : Templates d'emails/SMS, suivi des interactions
- **Calendar Integration Service** : Synchronisation des visites avec calendriers externes

### Service de contrats

- **Contract Generation Service** : Génération de PDF avec données dynamiques
- **Multi-party Signature Service** : Workflow de signature à plusieurs parties
- **Document Archival Service** : Stockage sécurisé avec recherche full-text
- **Legal Compliance Service** : Vérification des clauses obligatoires

### Service financier

- **Commission Management Service** : Calcul, facturation, suivi des commissions
- **Invoice Generation Service** : Création de factures PDF professionnelles
- **Payment Tracking Service** : Suivi des encaissements, relances
- **Financial Reporting Service** : Rapports CA, commissions, charges

### Service d'équipe

- **Team Management Service** : Gestion des comptes agents, permissions
- **Performance Tracking Service** : KPI par agent, objectifs, commissions
- **Internal Communication Service** : Messagerie interne, partage de dossiers
- **Training Resource Service** : Bibliothèque de ressources internes

### Service d'analytics

- **Business Intelligence Service** : Tableaux de bord personnalisables
- **Market Analysis Service** : Données de marché comparatives
- **Forecasting Service** : Projections de CA, besoins en ressources
- **Alerting Service** : Détection d'anomalies, opportunités business

### Service de communication

- **Multi-channel Communication Service** : Email, SMS, push, in-app
- **CRM Integration Service** : Gestion de la base de contacts
- **Marketing Automation Service** : Campagnes segmentées, follow-up
- **Social Media Integration Service** : Publication automatique sur réseaux sociaux

---

## Sécurité et conformité

### Authentification et autorisation

- **Multi-factor authentication** : Obligatoire pour tous les comptes agence
- **Role-Based Access Control** : Rôles hiérarchiques (admin, manager, agent, assistant)
- **Row Level Security** : Isolation stricte des données par agence
- **Session management** : Revocation, expiration, monitoring des connexions
- **API rate limiting** : Protection contre les abus, quotas par agence

### Protection des données

- **Chiffrement** : Données sensibles au repos (documents légaux, coordonnées bancaires)
- **Chiffrement en transit** : TLS 1.3 pour toutes les communications
- **Anonymisation** : Données analytics anonymisées pour benchmarking
- **Backup automatique** : Rétention 10 ans pour documents légaux
- **GDPR/CNIL compliance** : Droit à l'oubli, portabilité, consentement explicite

### Sécurité des documents

- **Watermarking dynamique** : Marquage des documents PDF avec identifiant unique
- **Accès contrôlé** : Liens signés avec expiration, mot de passe optionnel
- **Audit trail complet** : Traçabilité de tous les accès aux documents sensibles
- **Chiffrement des fichiers** : Stockage chiffré pour mandats, contrats, factures
- **Intégrité des documents** : Hash de vérification pour détection de modifications

### Conformité légale

- **Mandats conformes** : Droit ivoirien des mandats immobiliers
- **Clauses légales** : Validation par avocats partenaires spécialisés
- **Conservation légale** : 10 ans minimum pour mandats, contrats, factures
- **Transparence des commissions** : Affichage obligatoire des taux, pas de frais cachés
- **Litiges** : Médiation intégrée avec Trust Agents pour résolution amiable
- **Protection des dépôts** : Compte séquestre pour dépôts de garantie (futur)

### Sécurité financière

- **PCI DSS compliance** : Via processeur de paiement tiers (futur)
- **Tokenisation** : Pas de stockage de données bancaires sensibles
- **Validation des virements** : Vérification IBAN/RIB avant virement de commissions
- **Audit financier** : Traçabilité complète de toutes les transactions financières
- **Fraud detection** : Détection de patterns suspects, blocage automatique
- **Réconciliation automatique** : Matching factures/paiements (futur)

---

## Roadmap d'évolution

### Phase 1 : Fonctionnalités de base (✓ Complété)

- [x] Inscription/validation agence
- [x] Gestion basique des mandats
- [x] Publication de biens sous mandat
- [x] Tableau de bord agence
- [x] Messagerie avec propriétaires/candidats
- [x] Profil public d'agence

### Phase 2 : Gestion professionnelle (✓ Complété)

- [x] Signature électronique des mandats (CryptoNeo)
- [x] Gestion d'équipe avec permissions
- [x] Pipeline des candidatures (Kanban)
- [x] Génération de contrats de bail
- [x] Calcul automatique des commissions
- [x] Facturation électronique

### Phase 3 : Optimisation et automation (🔄 En cours)

- [ ] Workflow de signature multi-parties pour contrats
- [ ] Synchronisation calendrier (Google, Outlook)
- [ ] Scoring automatique des candidatures
- [ ] Campagnes email automatisées
- [ ] Application mobile dédiée agents
- [ ] Intégration réseaux sociaux

### Phase 4 : Intelligence business (📅 Planifié Q2 2026)

- [ ] Analytics avancés avec benchmarking marché
- [ ] Prévisions de CA et besoins en ressources
- [ ] Générateur d'annonces sociales automatisé
- [ ] Reconnaissance OCR des documents (CNI, bulletins)
- [ ] Suggestions de prix optimaux basées sur IA
- [ ] Alertes intelligentes d'opportunités

### Phase 5 : Écosystème partenarial (📅 Planifié H2 2026)

- [ ] Marketplace de prestataires (photographes, notaires, diagnostiqueurs)
- [ ] Intégration avec logiciels de comptabilité (Sage, QuickBooks)
- [ ] Portail propriétaire délégué avec accès limité
- [ ] Certification "Agence Partenaire MonToit"
- [ ] API ouverte pour intégrations CRM externes
- [ ] Programme de fidélité pour propriétaires récurrents

### Phase 6 : Expansion et innovation (📅 Planifié 2027)

- [ ] Gestion multi-agences (groupes, franchises)
- [ ] Portefeuille numérique des biens (tokenisation)
- [ ] Visites virtuelles 3D avec mesures automatiques
- [ ] Assurance habitation intégrée aux contrats
- [ ] Marketplace de financement (crédit immobilier)
- [ ] Expansion régionale (autres pays francophones)

---

## Métriques et KPI

### Métriques utilisateur (agence)

- **Temps d'onboarding** : < 48h entre inscription et activation complète
- **Taux d'adoption** : > 70% des fonctionnalités utilisées régulièrement
- **Satisfaction agence** : NPS > 50
- **Retention mensuelle** : > 90% des agences actives
- **Productivité** : +30% de biens gérés par agent vs hors plateforme

### Métriques techniques

- **Temps de chargement dashboard** : < 1 seconde
- **Disponibilité** : 99.95% uptime
- **Erreurs** : < 0.02% des requêtes
- **Performance mobile** : Lighthouse score > 94
- **Taille bundle agence** : < 700KB initial

### Métriques business

- **Nombre d'agences actives** : Croissance mensuelle 15%
- **Nombre de mandats signés** : > 5 mandats/agence/mois en moyenne
- **Taux de conversion candidatures** : > 25% des candidatures → visite
- **Taux de conversion visites** : > 40% des visites → location
- **CA généré via plateforme** : Croissance trimestrielle 30%
- **Commissions perçues** : > 80% des commissions facturées payées

### Métriques qualité

- **Qualité des annonces** : Score moyen > 4.5/5 (photos, description, complétude)
- **Délai moyen de location** : < 30 jours pour biens standard
- **Taux de renouvellement mandats** : > 60% des mandats renouvelés
- **Avis propriétaires** : Note moyenne > 4.5/5
- **Support satisfaction** : CSAT > 95%

---

## Documentation technique

### Pour les développeurs

- **API Documentation** : Swagger/OpenAPI complète pour services agence
- **Component Library** : Storybook avec composants spécifiques agence
- **Database Schema** : Diagrammes ERD détaillés avec relations agence
- **Deployment Guide** : Environnements staging, production, rollback
- **Testing Strategy** : Tests unitaires, d'intégration, e2e, performance
- **Security Guidelines** : Bonnes pratiques pour données sensibles agence

### Pour les utilisateurs (agences)

- **Guide de l'agence** : Documentation complète illustrée avec cas d'usage
- **FAQ agence** : Questions fréquentes sur mandats, commissions, fonctionnalités
- **Video Tutorials** : Screencasts des workflows clés (mandat, candidature, facturation)
- **Webinaires mensuels** : Formations avancées, nouvelles fonctionnalités
- **Support dédié agence** : Email prioritaire, chat, téléphone, compte manager
- **Centre d'aide spécialisé** : Articles juridiques, conseils marketing, templates

### Pour les partenaires (prestataires, intégrateurs)

- **API Partner Guide** : Intégration pour prestataires (photographes, diagnostiqueurs)
- **Webhook Documentation** : Événements agence (nouveau mandat, signature, paiement)
- **Compliance Checklist** : Exigences pour partenariats certifiés
- **Brand Guidelines** : Utilisation du logo, charte graphique partenaires
- **Contract Templates** : Modèles de conventions de partenariat

### Pour l'équipe interne

- **Admin Documentation** : Gestion des comptes agence, modération, validation
- **Moderation Guidelines** : Validation des documents agence, contrôle qualité annonces
- **Support Playbook** : Procédures pour incidents courants agence
- **Analytics Dashboard** : Tableaux de bord internes de performance agence
- **Security Protocols** : Procédures de réponse aux incidents, audit sécurité
- **Training Materials** : Formation des équipes support sur spécificités agence

---

## Conclusion

Cette roadmap représente la vision complète de l'expérience agence immobilière sur MonToit. Elle évoluera en fonction des retours utilisateurs, des avancées technologiques, et des besoins du marché immobilier professionnel ivoirien.

**Prochaines étapes immédiates** :

1. Finaliser le workflow de signature multi-parties pour contrats
2. Déployer la synchronisation calendrier Google/Outlook
3. Optimiser le pipeline des candidatures avec scoring automatique
4. Améliorer les analytics avec benchmarking marché

**Contacts** :

- Développement : dev@montoit.ci
- Support agences : agences@montoit.ci
- Partenariats professionnels : partenariats-pro@montoit.ci
- Assistance juridique agences : juridique-agences@montoit.ci

---

_Document maintenu par l'équipe technique MonToit - ANSUT_
