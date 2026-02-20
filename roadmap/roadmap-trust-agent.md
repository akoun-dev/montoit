# Roadmap Tiers de Confiance (Trust Agent) - MonToit Platform

## Vue d'ensemble

Cette roadmap décrit l'ensemble des fonctionnalités, parcours utilisateur, et évolutions prévues pour l'espace Tiers de Confiance (Trust Agent) de la plateforme MonToit. Elle sert de référence pour le développement, les tests, et la documentation.

**Dernière mise à jour** : 13 février 2026  
**Version** : 3.2.2  
**Public cible** : Agents de confiance certifiés ANSUT pour la médiation, validation et certification dans l'écosystème immobilier ivoirien

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

### 1. Recrutement et certification

- **Candidature** : Formulaire de demande avec justificatifs (diplômes, expérience)
- **Vérification des antécédents** : Vérification judiciaire, validation des références
- **Formation initiale** : Modules e-learning sur réglementation, éthique, procédures
- **Examen de certification** : Test en ligne supervisé, cas pratiques
- **Délivrance du badge** : Certification ANSUT Trust Agent avec niveau (Junior, Senior, Expert)
- **Onboarding technique** : Configuration du compte, formation à la plateforme

### 2. Gestion des missions

- **Réception des missions** : Assignation automatique ou manuelle selon spécialité/disponibilité
- **Consultation des détails** : Dossier complet, historique, parties impliquées
- **Planification** : Calendrier intégré, gestion des disponibilités
- **Préparation** : Checklist de préparation, documents requis, contacts
- **Exécution sur site** : Application mobile dédiée avec mode hors ligne
- **Rapport post-mission** : Saisie des observations, preuves, conclusions

### 3. Validation des dossiers

- **Réception des dossiers** : Locataires, propriétaires, agences en attente de validation
- **Vérification documentaire** : Analyse des pièces jointes (CNI, justificatifs, RCCM)
- **Contrôle de cohérence** : Croisement des informations, détection d'anomalies
- **Validation d'identité** : Vérification ONECI, CNAM, reconnaissance faciale
- **Décision de validation** : Approbation, rejet avec motifs, demande de compléments
- **Notification aux parties** : Communication du résultat, justifications

### 4. Missions CEV (Contrôle d'Entrée en Vigueur)

- **Programmation** : Coordination avec propriétaire/agence pour rendez-vous
- **Inspection sur site** : Vérification conformité réglementaire, sécurité, équipements
- **Documentation** : Photos géolocalisées, notes, mesures, constats
- **Évaluation** : Grille de notation standardisée, critères ANSUT
- **Rapport CEV** : Document officiel avec recommandations, délais de mise en conformité
- **Suivi des corrections** : Vérification des travaux, levée des réserves

### 5. Médiation de litiges

- **Saisine du litige** : Réception de la demande via plateforme ou formulaire dédié
- **Analyse préliminaire** : Examen du contrat, des preuves, historique des échanges
- **Audition des parties** : Entretiens individuels ou communs (visio ou présentiel)
- **Recherche de preuves** : Collecte de documents, témoignages, expertises
- **Proposition de résolution** : Rédaction d'une proposition équitable, négociation
- **Accord ou escalade** : Signature électronique de l'accord ou transmission à l'arbitrage

### 6. Certification des biens

- **Demande de certification** : Initiation par propriétaire ou agence
- **Audit complet** : Vérification titre de propriété, conformité, équipements, sécurité
- **Visite technique** : Inspection par expert habilité si nécessaire
- **Attribution du label** : Niveau de certification (Bronze, Argent, Or, Platine)
- **Publication du badge** : Affichage sur fiche du bien, valorisation marketing
- **Surveillance périodique** : Audits de maintien de certification (annuels)

### 7. États des lieux

- **Programmation** : Coordination entre propriétaire et locataire pour rendez-vous
- **Inventaire détaillé** : Pièce par pièce, équipement par équipement
- **Documentation photographique** : Photos datées et géolocalisées avec annotations
- **Mesures et constats** : État des surfaces, fonctionnement des équipements, remarques
- **Rapport signé** : Signature électronique des parties, archivage légal
- **Gestion des réserves** : Suivi des résolutions, rapport de sortie comparatif

### 8. Reporting et analytics

- **Tableaux de bord personnalisés** : Activité, performance, satisfaction clients
- **Rapports périodiques** : Mensuels, trimestriels, annuels pour ANSUT
- **Analytics de performance** : Temps de traitement, taux de résolution, satisfaction
- **Export de données** : Pour analyse externe, présentation aux parties prenantes
- **Alertes et tendances** : Détection d'patterns, recommandations d'amélioration

---

## Fonctionnalités principales

### Gestion des missions

- **Tableau de bord missions** : Vue consolidée (en attente, en cours, terminées)
- **Filtres avancés** : Par type, urgence, localisation, date, statut
- **Calendrier intégré** : Visualisation mensuelle/semaine/jour, conflits de planning
- **Assignation intelligente** : Algorithmes de matching (proximité, compétences, charge)
- **Workflow configurable** : Étapes personnalisables par type de mission
- **Notifications temps réel** : Nouvelles missions, rappels, modifications

### Validation des dossiers

- **Interface de validation unifiée** : Tous les types de dossiers (locataire, propriétaire, agence)
- **Visionneuse documentaire** : Visualisation PDF, images, avec outils d'annotation
- **Vérification automatique** : Intégration APIs ONECI, CNAM, reconnaissance faciale
- **Grilles d'évaluation** : Critères standardisés, notation, commentaires structurés
- **Historique des décisions** : Traçabilité complète, motifs, justifications
- **Communication automatisée** : Templates de notifications selon décision

### Missions CEV (Contrôle d'Entrée en Vigueur)

- **Checklist interactive** : Liste de contrôle réglementaire avec statut (OK/KO/NA)
- **Capture de preuves** : Photos avec géolocalisation, timestamp, annotations
- **Rapport généré automatiquement** : À partir des données saisies, format standardisé
- **Gestion des non-conformités** : Classement par gravité, délais de correction
- **Suivi des actions correctives** : Plan d'action, échéances, preuves de réalisation
- **Base de connaissances réglementaire** : Référentiels techniques, textes de loi

### Médiation de litiges

- **Portail de médiation dédié** : Interface séparée pour confidentialité
- **Gestion des preuves** : Upload sécurisé, catégorisation, partage contrôlé
- **Outils de communication** : Messagerie sécurisée, visioconférence intégrée
- **Modèles de propositions** : Templates de résolution selon type de litige
- **Suivi des engagements** : Calendrier des échéances, rappels automatiques
- **Archivage sécurisé** : Dossier de médiation complet avec accès restreint

### Certification des biens

- **Processus de certification** : Workflow étape par étape avec validation multiples
- **Grilles d'évaluation multi-niveaux** : Critères techniques, réglementaires, confort
- **Générateur de rapports** : Documents professionnels avec logo ANSUT, signatures
- **Gestion des labels** : Attribution, renouvellement, suspension, retrait
- **Portail public des biens certifiés** : Recherche, filtres, visualisation des badges
- **Surveillance continue** : Alertes pour changements affectant la certification

### États des lieux

- **Application mobile dédiée** : Fonctionnement hors ligne, synchronisation automatique
- **Inventaire interactif** : Liste pré-remplie selon type de bien, personnalisable
- **Outils de capture** : Appareil photo intégré, annotation, mesures
- **Générateur de rapports** : PDF professionnel avec photos intégrées
- **Signature électronique** : Sur place via tablette ou à distance
- **Comparaison entrée/sortie** : Mise en regard automatique des deux états

### Gestion des agents de terrain

- **Annuaire des agents** : Profils, compétences, disponibilités, localisation
- **Assignation des missions** : Répartition équitable, optimisation des déplacements
- **Suivi en temps réel** : Géolocalisation (avec consentement), statut des missions
- **Évaluation des performances** : KPI qualité, satisfaction clients, productivité
- **Communication interne** : Messagerie sécurisée, annonces, alertes
- **Formation continue** : Modules e-learning, certifications additionnelles

### Analytics et reporting

- **Tableaux de bord personnalisables** : Widgets drag & drop, filtres temporels
- **Indicateurs clés** : Taux de validation, délais de traitement, satisfaction
- **Analyse géographique** : Carte de chaleur des missions, concentration des litiges
- **Prévisions de charge** : Estimation des besoins en ressources selon tendances
- **Reporting réglementaire** : Rapports standardisés pour ANSUT, autorités
- **Export avancé** : PDF, Excel, PowerPoint, intégration BI externes

### Communication et collaboration

- **Messagerie sécurisée** : Chiffrée de bout en bout, conservation légale
- **Visioconférence intégrée** : Sans téléchargement, enregistrement optionnel
- **Partage de documents** : Espaces collaboratifs par dossier/mission
- **Notifications multi-canaux** : In-app, email, SMS, push selon criticité
- **Intégration calendrier** : Synchronisation Google Calendar, Outlook, Apple Calendar
- **Annuaire des contacts** : Parties prenantes, collègues, experts, autorités

### Profil et réputation

- **Profil public Trust Agent** : Présentation, compétences, certifications, statistiques
- **Système de notation** : Avis vérifiés des parties après mission
- **Badges de compétence** : Spécialisations (CEV, médiation, certification, etc.)
- **Portfolio** : Missions réalisées (anonymisées), témoignages
- **Statistiques de performance** : Transparence sur taux de réussite, satisfaction
- **Développement professionnel** : Suivi formations, certifications additionnelles

---

## Architecture technique

### Stack frontend

- **Framework** : React 18 + TypeScript
- **Build tool** : Vite 7.3
- **Styling** : Tailwind CSS 3.4 + Radix UI
- **State management** : Zustand (global) + TanStack Query (server)
- **Routing** : React Router 7
- **Maps** : Mapbox GL pour visualisation géographique des missions
- **PDF generation** : jsPDF + html2pdf.js pour rapports, états des lieux
- **Charts** : Recharts pour analytics et reporting
- **Calendar** : FullCalendar intégration avancée
- **Mobile offline** : Service Workers, IndexedDB pour application mobile

### Services backend (Supabase)

- **Base de données** : PostgreSQL avec RLS (isolation par agent/équipe)
- **Authentification** : JWT, MFA obligatoire, sessions courtes
- **Stockage** : S3-like pour documents, photos, rapports, preuves
- **Realtime** : Websockets pour notifications en temps réel, suivi mission
- **Edge Functions** : Serverless functions pour génération PDF, notifications, intégrations APIs

### Services externes

- **Vérification d'identité** : ONECI API, CNAM API, reconnaissance faciale (NeoFace)
- **Géolocalisation** : Mapbox, Google Maps pour navigation, géocodage
- **Signature électronique** : CryptoNeo pour rapports, accords, états des lieux
- **Notifications** : Resend (email), Azure SMS, push notifications (Firebase)
- **Visioconférence** : Daily.co, Zoom API ou Jitsi intégré
- **OCR/document processing** : Azure Form Recognizer, Tesseract.js
- **Analytics** : Sentry, Google Analytics 4, Mixpanel

### Application mobile (Capacitor)

- **Framework cross-platform** : Capacitor 7 + React
- **Fonctionnalités natives** : Appareil photo, géolocalisation GPS, mode hors ligne
- **Synchronisation** : Background sync, conflits resolution
- **Sécurité** : Chiffrement local, biométrie, session management
- **Performance** : Optimisation pour réseaux lents, cache intelligent

### Structure des données principales

#### Tables clés pour Trust Agent

```sql
-- Agents de confiance
trust_agents (id, user_id, certification_level, specialization, availability, performance_score)

-- Missions
trust_agent_missions (id, type, property_id, assigned_agent_id, status, scheduled_date, completed_date)

-- Validations de dossiers
dossier_validations (id, user_id, validator_id, type, status, decision, decision_date)

-- Missions CEV
cev_missions (id, property_id, agent_id, inspection_date, compliance_score, report_url)

-- Litiges
disputes (id, contract_id, mediator_id, status, resolution_type, settlement_amount)

-- Certifications de biens
property_certifications (id, property_id, certifying_agent_id, level, valid_until, audit_history)

-- États des lieux
property_inspections (id, property_id, agent_id, type, report_url, signed_by_owner, signed_by_tenant)

-- Rapports d'activité
agent_reports (id, agent_id, period, missions_completed, validation_decisions, avg_satisfaction)
```

---

## Services et intégrations

### Service de missions

- **Mission Management Service** : Création, assignation, suivi des missions
- **Calendar Integration Service** : Synchronisation avec calendriers externes
- **Location Optimization Service** : Optimisation des tournées, calcul d'itinéraires
- **Notification Service** : Alertes nouvelles missions, rappels, changements de statut

### Service de validation

- **Dossier Validation Service** : Workflow de validation des dossiers utilisateurs
- **Document Verification Service** : Analyse des pièces jointes, détection de fraude
- **Identity Verification Service** : Intégration ONECI, CNAM, reconnaissance faciale
- **Decision Tracking Service** : Traçabilité des décisions, motifs, justifications

### Service CEV

- **CEV Inspection Service** : Checklist réglementaire, capture de preuves
- **Compliance Assessment Service** : Évaluation de conformité, scoring
- **Report Generation Service** : Génération de rapports CEV standardisés
- **Corrective Action Service** : Suivi des actions correctives, vérification

### Service de médiation

- **Dispute Management Service** : Gestion du cycle de vie des litiges
- **Evidence Management Service** : Stockage sécurisé, partage contrôlé des preuves
- **Mediation Communication Service** : Messagerie sécurisée, visioconférence
- **Settlement Agreement Service** : Génération d'accords, signature électronique

### Service de certification

- **Property Certification Service** : Processus de certification des biens
- **Label Management Service** : Attribution, gestion des labels ANSUT
- **Audit Scheduling Service** : Planification des audits de maintien
- **Certification Analytics Service** : Statistiques des biens certifiés, impact marché

### Service d'états des lieux

- **Inspection Management Service** : Gestion des états des lieux entrée/sortie
- **Mobile Capture Service** : Application mobile pour capture sur site
- **Report Comparison Service** : Comparaison automatique entrée/sortie
- **Digital Signature Service** : Signature électronique des parties

### Service d'analytics

- **Performance Analytics Service** : KPI agents, équipes, satisfaction clients
- **Geospatial Analysis Service** : Cartographie des missions, analyse territoriale
- **Predictive Analytics Service** : Prévisions de charge, détection de tendances
- **Regulatory Reporting Service** : Génération de rapports pour autorités

### Service de communication

- **Secure Messaging Service** : Communication chiffrée entre toutes les parties
- **Multi-channel Notification Service** : Notifications selon préférences, criticité
- **Video Conferencing Service** : Visioconférence intégrée, enregistrement
- **Document Collaboration Service** : Espaces partagés, commentaires, versions

---

## Sécurité et conformité

### Authentification et autorisation

- **Multi-factor authentication obligatoire** : SMS + app authenticator
- **Role-Based Access Control granulaire** : Niveaux Trust Agent (Junior, Senior, Expert, Manager)
- **Row Level Security stricte** : Isolation des données par agent/équipe
- **Session management avancé** : Timeout court, revocation à distance, monitoring
- **API rate limiting strict** : Protection contre les attaques, quotas par agent

### Protection des données

- **Chiffrement de bout en bout** : Pour toutes les communications sensibles
- **Chiffrement au repos** : Données sensibles (preuves, documents confidentiels)
- **Anonymisation** : Données analytics anonymisées pour reporting public
- **Backup et retention** : 10+ ans pour documents légaux, 30 jours pour données opérationnelles
- **GDPR/CNIL compliance** : Droit à l'oubli limité (exceptions légales), portabilité

### Sécurité des documents et preuves

- **Watermarking dynamique** : Tous les documents exportés avec watermark identifiant
- **Chiffrement des fichiers** : Stockage chiffré pour preuves sensibles
- **Audit trail complet** : Traçabilité de tous les accès, modifications, partages
- **Intégrité numérique** : Hash de vérification pour détection d'altération
- **Accès contrôlé** : Permissions granulaires, expiration automatique des liens

### Conformité légale et réglementaire

- **Conformité ANSUT** : Respect du référentiel Trust Agent, code de déontologie
- **Validité légale** : Rapports, états des lieux, accords ayant valeur probante
- **Conservation légale** : 10 ans minimum pour rapports CEV, états des lieux, accords de médiation
- **Transparence des processus** : Traçabilité complète des décisions, motifs documentés
- **Indépendance et impartialité** : Mécanismes de prévention des conflits d'intérêt
- **Protection des témoignages** : Confidentialité des sources, anonymisation si nécessaire

### Sécurité opérationnelle

- **Formation sécurité obligatoire** : Modules annuels pour tous les Trust Agents
- **Procédures d'urgence** : Protocoles pour situations à risque, alerte discrète
- **Vérification des antécédents** : Renouvellement annuel pour agents actifs
- **Assurance responsabilité professionnelle** : Couverture obligatoire, vérification
- **Audit sécurité régulier** : Tests de pénétration, revue de code, audit de processus

### Confidentialité et éthique

- **Accords de confidentialité** : Signature électronique obligatoire pour tous les agents
- **Ethical guidelines** : Code de conduite, procédures de signalement d'irrégularités
- **Gestion des conflits d'intérêt** : Déclaration obligatoire, récusation automatique
- **Protection des données personnelles** : Minimisation des données, consentement explicite
- **Transparence vis-à-vis des parties** : Information claire sur le rôle, les limites, les frais

---

## Roadmap d'évolution

### Phase 1 : Fonctionnalités de base (✓ Complété)

- [x] Interface Trust Agent avec tableau de bord
- [x] Gestion des missions basique (affectation, suivi)
- [x] Validation des dossiers locataires/propriétaires
- [x] États des lieux numériques
- [x] Messagerie sécurisée avec les parties
- [x] Profil Trust Agent public

### Phase 2 : Spécialisations avancées (✓ Complété)

- [x] Missions CEV (Contrôle d'Entrée en Vigueur)
- [x] Médiation de litiges avec workflow structuré
- [x] Certification des biens (labels ANSUT)
- [x] Application mobile pour missions sur site
- [x] Intégration ONECI/CNAM pour vérification d'identité
- [x] Rapports PDF professionnels avec signature électronique

### Phase 3 : Optimisation et intelligence (🔄 En cours)

- [ ] Algorithmes d'assignation intelligente des missions
- [ ] Reconnaissance faciale intégrée pour vérification sur site
- [ ] Analyse prédictive des litiges (risque, durée probable)
- [ ] Application mobile mode hors ligne complet
- [ ] Intégration visioconférence pour médiation à distance
- [ ] Tableaux de bord analytics avancés

### Phase 4 : Automatisation et scale (📅 Planifié Q2 2026)

- [ ] Chatbot IA pour pré-qualification des demandes
- [ ] OCR avancé pour analyse automatique de documents
- [ ] Génération automatique de propositions de résolution (IA)
- [ ] Marketplace de services Trust Agent (spécialisations)
- [ ] Formation e-learning certifiante intégrée
- [ ] Portail client pour suivi en temps réel des missions

### Phase 5 : Écosystème et innovation (📅 Planifié H2 2026)

- [ ] Blockchain pour traçabilité immuable des validations
- [ ] IoT intégration pour monitoring à distance des biens certifiés
- [ ] Réalité augmentée pour assistance lors des inspections
- [ ] Certification internationale (normes ISO)
- [ ] API ouverte pour intégration avec assureurs, banques
- [ ] Programme de parrainage Trust Agent (formation de nouveaux)

### Phase 6 : Leadership et influence (📅 Planifié 2027)

- [ ] Observatoire du marché immobilier (données Trust Agent)
- [ ] Influence sur les politiques publiques (données anonymisées)
- [ ] Expansion régionale (autres pays UEMOA)
- [ ] Certification "Smart Building" avec critères technologiques
- [ ] Laboratoire d'innovation Trust Tech
- [ ] Fondation pour la confiance dans l'immobilier

---

## Métriques et KPI

### Métriques utilisateur (Trust Agent)

- **Temps de traitement moyen** : < 48h pour validation de dossier standard
- **Satisfaction clients** : NPS > 60
- **Taux de résolution litiges** : > 85% résolus en médiation (vs arbitrage)
- **Qualité des rapports** : Score moyen > 4.5/5 (complétude, clarté)
- **Productivité** : Nombre de missions/mois > 20 (plein temps)

### Métriques techniques

- **Temps de chargement interface** : < 1 seconde
- **Disponibilité** : 99.99% uptime (service critique)
- **Performance mobile** : Application fonctionnelle en 3G, mode hors ligne robuste
- **Sécurité** : 0 incidents de sécurité majeurs, 100% conformité audits
- **Latence notifications** : < 5 secondes pour notifications critiques

### Métriques business

- **Nombre de Trust Agents actifs** : Croissance mensuelle 10%
- **Couverture géographique** : > 80% des communes urbaines desservies
- **Taux d'adoption** : > 70% des litiges traités via plateforme vs hors plateforme
- **Impact sur la confiance** : Réduction > 50% des litiges judiciaires dans le secteur
- **Revenue par agent** : Modèle mixte (abonnement + commission sur médiation)

### Métriques qualité

- **Consistance des décisions** : Écart-type < 0.5 sur échelle de notation 1-5
- **Délai de réponse** : < 2h pour urgences, < 24h pour standards
- **Taux d'erreur** : < 1% des décisions contestées et infirmées
- **Formation continue** : > 20h/an/agent de formation certifiante
- **Renouvellement certifications** : > 90% des agents recertifiés annuellement

### Métriques impact social

- **Réduction des litiges** : > 30% de litiges en moins dans les biens certifiés
- **Transparence du marché** : Indice de confiance > 75/100
- **Accès à la justice** : Coût médiation < 20% du coût procédure judiciaire
- **Protection des parties faibles** : Taux de satisfaction locataires > 80%
- **Développement professionnel** : > 500 Trust Agents certifiés d'ici 2027

---

## Documentation technique

### Pour les développeurs

- **API Documentation complète** : Swagger/OpenAPI pour tous les services Trust Agent
- **Component Library spécialisée** : Storybook avec composants spécifiques (missions, validations, rapports)
- **Database Schema détaillé** : Diagrammes ERD avec relations complexes Trust Agent
- **Deployment Guide** : Environnements dédiés (staging trust, production trust)
- **Testing Strategy avancée** : Tests unitaires, d'intégration, e2e, tests de sécurité renforcés
- **Security Guidelines strictes** : Protocoles pour données sensibles, PII, preuves

### Pour les utilisateurs (Trust Agents)

- **Guide du Trust Agent** : Manuel complet avec cas pratiques, exemples concrets
- **FAQ spécialisée** : Questions juridiques, techniques, déontologiques
- **Video Tutorials professionnels** : Démonstrations des workflows complexes
- **Webinaires experts** : Sessions avec avocats, experts techniques, régulateurs
- **Support prioritaire** : Hotline dédiée, chat en direct, visioconférence assistance
- **Centre de ressources** : Textes de loi, jurisprudence, modèles de documents

### Pour les parties prenantes (clients, ANSUT, autorités)

- **Portail client** : Documentation sur le processus, droits, obligations
- **Reporting ANSUT** : Documentation sur les indicateurs, méthodologie de collecte
- **Guide régulateur** : Explication du modèle, garanties, mécanismes de contrôle
- **Transparency portal** : Données anonymisées, statistiques, études d'impact
- **API pour intégration** : Documentation pour assureurs, banques, plateformes partenaires

### Pour l'équipe interne

- **Admin Documentation complète** : Gestion des comptes Trust Agent, permissions, audits
- **Moderation Guidelines strictes** : Procédures de contrôle qualité, suspension, recertification
- **Support Playbook détaillé** : Arbres de décision pour tous les scénarios complexes
- **Analytics Dashboard interne** : Monitoring en temps réel, alertes proactives
- **Security Incident Response Plan** : Procédures d'urgence, communication de crise
- **Training Materials complets** : Programmes de formation, évaluation, certification interne

---

## Conclusion

Cette roadmap représente la vision complète du rôle de Tiers de Confiance (Trust Agent) dans l'écosystème MonToit. Elle évoluera en fonction des retours des agents, des avancées réglementaires, et des besoins du marché immobilier ivoirien en matière de confiance et de sécurité juridique.

**Prochaines étapes immédiates** :

1. Finaliser l'application mobile mode hors ligne complet
2. Déployer l'intégration visioconférence pour médiation à distance
3. Optimiser les algorithmes d'assignation intelligente des missions
4. Lancer le programme de formation e-learning certifiante

**Contacts** :

- Développement Trust Agent : dev-trust@montoit.ci
- Support Trust Agents : support-trust@montoit.ci
- Relations ANSUT : ansut@montoit.ci
- Assistance juridique : juridique-trust@montoit.ci
- Formation et certification : formation-trust@montoit.ci

---

_Document maintenu par l'équipe technique MonToit - ANSUT_
