# Fonctionnalités Manquantes — Mon Toit

> **Date :** 26 mai 2026
> **Projet :** Mon Toit — Plateforme de location immobilière (Côte d'Ivoire)
> **Stack :** Next.js 16 + React 19 + Supabase + Capacitor + Tailwind CSS v4
> **Rôles :** LOCATAIRE, PROPRIETAIRE, AGENCE, TIERS_CONFIANCE, ADMIN

---

## Table des Matières

1. [Par Rôle Utilisateur](#1-par-rôle-utilisateur)
   - [Locataire](#11-locataire)
   - [Propriétaire](#12-propriétaire)
   - [Agence](#13-agence)
   - [Tiers de Confiance](#14-tiers-de-confiance)
   - [Admin](#15-admin)
   - [Multi-rôle & Transversal](#16-multi-rôle--transversal)
2. [Par Domaine Fonctionnel](#2-par-domaine-fonctionnel)
   - [Paiements & Finance](#21-paiements--finance)
   - [Communication & Messagerie](#22-communication--messagerie)
   - [Recherche & Découverte](#23-recherche--découverte)
   - [Documents & Légal](#24-documents--légal)
   - [Mobile & Offline](#25-mobile--offline)
   - [Internationalisation](#26-internationalisation)
3. [Par Priorité Stratégique](#3-par-priorité-stratégique)
   - [🔴 Immédiat (Sprint 1-2)](#31--immédiat-sprint-1-2)
   - [🟠 Court terme (Sprint 3-5)](#32--court-terme-sprint-3-5)
   - [🟡 Moyen terme (Sprint 6-10)](#33--moyen-terme-sprint-6-10)
   - [🟢 Long terme (Sprint 11+)](#34--long-terme-sprint-11)
4. [Fonctionnalités Spécifiques Marché Africain](#4-fonctionnalités-spécifiques-marché-africain)

---

## 1. Par Rôle Utilisateur

### 1.1 Locataire

| # | Fonctionnalité | Description | Valeur ajoutée | Effort |
|---|---|---|---|---|
| L1 | **Visites virtuelles 3D / 360°** | Intégration de Matterport ou équivalent pour visiter les biens à distance | Réduit les visites physiques, utile pour la diaspora | ⭐⭐⭐ |
| L2 | **Alertes de recherche personnalisées** | Notifications push/email lors de la parution d'un bien correspondant aux critères | Fidélisation, retour régulier sur la plateforme | ⭐ |
| L3 | **Sauvegarde de recherches** | Historique et sauvegarde des filtres de recherche | Gain de temps, réengagement | ⭐ |
| L4 | **Comparateur de biens** | Sélectionner 2-4 biens et les comparer côte-à-côte (prix, surface, équipements) | Aide à la décision | ⭐⭐ |
| L5 | **Itinéraire / Temps de trajet** | Calcul du temps de trajet depuis le bien vers des points d'intérêt (travail, écoles) | Information contextuelle précieuse | ⭐⭐ |
| L6 | **Guide de quartier** | Infos sur le quartier (commerces, transports, sécurité, écoles, hôpitaux) | Décision éclairée | ⭐⭐ |
| L7 | **Carnet d'adresses / Favoris avancé** | Listes personnalisées de favoris (ex: "À visiter", "Déjà visité", "Coup de coeur") | Organisation des recherches | ⭐ |
| L8 | **Dépôt de dossier en ligne** | Soumettre un dossier complet (pièces justificatives) directement depuis la plateforme | Simplifie le processus de location | ⭐⭐ |
| L9 | **Statut de candidature en temps réel** | Suivre l'avancement de sa candidature (déposée, en cours d'étude, acceptée, refusée) | Transparence, réduit l'anxiété | ⭐ |
| L10 | **Paiement du loyer en ligne** | Payer son loyer depuis l'app (Orange Money, MTN MoMo, carte bancaire) | Confort, traçabilité | ⭐⭐⭐ |
| L11 | **Quittances de loyer numériques** | Génération et archivage automatique des quittances de loyer | Tenue de comptes, preuve légale | ⭐⭐ |
| L12 | **Demande de renouvellement de bail** | Workflow de renouvellement avec notifications et signature électronique | Simplifie la reconduction | ⭐⭐ |
| L13 | **Résiliation de bail en ligne** | Workflow de préavis avec calcul automatique des délais | Clarifie les fins de contrat | ⭐⭐ |
| L14 | **Suivi des paiements / Historique** | Tableau de bord des loyers payés, impayés, à venir | Gestion budgétaire | ⭐ |
| L15 | **État des lieux interactif** | Réaliser l'état des lieux depuis l'app avec photos et commentaires | Gain de temps, transparence | ⭐⭐⭐ |
| L16 | **Notation du propriétaire / agence** | Évaluer son propriétaire ou son agence après la location | Confiance, communauté | ⭐ |
| L17 | **Avis sur le bien (post-location)** | Laisser un avis sur le bien après y avoir habité | Aide les futurs locataires | ⭐ |
| L18 | **Carte de voisinage interactive** | Voir sur une carte les services à proximité : commerces, écoles, hôpitaux, transports | Vue d'ensemble pratique | ⭐⭐ |
| L19 | **Partage d'annonce vers WhatsApp** | Partager une annonce sur WhatsApp avec un message pré-formaté | Viralité, canal clé Afrique | ⭐ |
| L20 | **Colocation / Roommate Matching** | Mise en relation avec des chercheurs de colocation sur des biens adaptés | Ouvre un segment de marché important | ⭐⭐⭐ |
| L21 | **Onboarding locataire** | Checklist interactive des étapes post-signature : EDF, eau, internet, assurance | Accompagnement, réduction du churn | ⭐⭐ |

### 1.2 Propriétaire

| # | Fonctionnalité | Description | Valeur ajoutée | Effort |
|---|---|---|---|---|
| P1 | **Estimation locative IA** | Estimation automatique du loyer optimal basée sur les données du marché | Maximisation du rendement | ⭐⭐⭐ |
| P2 | **Tableau de bord financier** | Revenus, charges, impôts, rentabilité nette par bien | Pilotage financier | ⭐⭐ |
| P3 | **Génération de déclaration fiscale** | Export des données pour la déclaration fiscale (CFE, impôt sur le revenu) | Conformité, gain de temps | ⭐⭐ |
| P4 | **Gestion des cautions / dépôts de garantie** | Suivi des dépôts, conditions de restitution, calcul des intérêts | Transparence, sécurité | ⭐⭐ |
| P5 | **Relances automatiques impayés** | Séquence automatisée de relances (SMS, email, notification) avec historique | Réduction des impayés | ⭐ |
| P6 | **Workflow de relocation** | Processus guidé entre deux locataires : état des lieux sortie, travaux, publication, signature | Continuité de service | ⭐⭐ |
| P7 | **Gestion des travaux / rénovations** | Planning, photos avant/après, devis, factures | Traçabilité, valorisation du bien | ⭐⭐⭐ |
| P8 | **Portefeuille multi-biens** | Vue d'ensemble de tous ses biens avec métriques clés | Gestion de parc | ⭐ |
| P9 | **Calendrier des baux** | Timeline visuelle des baux en cours, à renouveler, à résilier | Anticipation, planning | ⭐⭐ |
| P10 | **Modèles de baux personnalisables** | Templates de contrat de location avec clauses modifiables | Conformité, flexibilité | ⭐⭐ |
| P11 | **Assurance Propriétaire Non-Occupant (PNO)** | Intégration avec des assureurs partenaires, devis en ligne | Service à valeur ajoutée | ⭐⭐⭐ |
| P12 | **Suivi des visites** | Historique des visites effectuées, retours des visiteurs | Suivi commercial | ⭐ |
| P13 | **Délégation de gestion** | Passer en mode "géré par une agence" avec vue consolidée | Flexibilité de gestion | ⭐⭐ |
| P14 | **Scoring du locataire** | Note basée sur l'historique de paiement, les avis des précédents propriétaires | Sélection éclairée | ⭐⭐⭐ |

### 1.3 Agence

| # | Fonctionnalité | Description | Valeur ajoutée | Effort |
|---|---|---|---|---|
| A1 | **CRM Agent** | Suivi des leads, pipeline commercial, historique des interactions | Professionnalisation | ⭐⭐⭐ |
| A2 | **Campagnes email/SMS automatisées** | Envoi programmé de newsletters, relances prospects, alertes biens | Marketing automation | ⭐⭐ |
| A3 | **Site vitrine agence personnalisable** | Page publique de l'agence avec ses biens, son équipe, ses avis | Visibilité, crédibilité | ⭐⭐ |
| A4 | **Tableau de bord des performances** | KPIs: taux de transformation, délai de relocation, CA/agent | Pilotage | ⭐⭐ |
| A5 | **Syndication d'annonces** | Publication automatique sur Jinka, Kotope, Facebook Marketplace, autres plateformes | Diffusion multi-canal | ⭐⭐⭐ |
| A6 | **Gestion des commissions** | Calcul automatique, répartition entre agence et agents, historique | Transparence | ⭐⭐ |
| A7 | **Gestion des clés / objets** | Suivi des clés prêtées, visites, inventaire | Organisation interne | ⭐ |
| A8 | **Modèles de mandats** | Mandats de gestion, de vente, de location — templates personnalisables | Gain de temps juridique | ⭐⭐ |
| A9 | **Portail client** | Espace client dédié où les propriétaires suivent leurs biens gérés par l'agence | Relation client | ⭐⭐⭐ |
| A10 | **Génération de rapports propriétaires** | Rapport mensuel/trimestriel automatisé (loyers perçus, charges, taxes) | Reporting pro | ⭐⭐ |
| A11 | **Agenda des visites partagé** | Calendrier des visites synchronisé, notifications automatiques | Organisation | ⭐ |
| A12 | **Signature électronique de mandats** | Intégration CryptoNeo pour les mandats de gestion | Dématérialisation | ⭐ |
| A13 | **Programme de parrainage agence** | Système de récompenses pour les clients/apporteurs d'affaires | Acquisition | ⭐⭐ |

### 1.4 Tiers de Confiance

| # | Fonctionnalité | Description | Valeur ajoutée | Effort |
|---|---|---|---|---|
| T1 | **Calendrier des inspections** | Planning des visites de vérification avec rappels | Organisation | ⭐ |
| T2 | **Checklist de vérification numérique** | Liste de contrôle interactive pour les visites terrain (photos, annotations) | Standardisation | ⭐⭐ |
| T3 | **Rapport d'inspection automatique** | Génération PDF du rapport de visite après validation | Professionnalisme | ⭐⭐ |
| T4 | **Historique TC complet** | Timeline de toutes les actions du TC avec détails (audit personnel) | Traçabilité | ⭐ |
| T5 | **Statistiques personnelles** | Nombre de vérifications, temps moyen, biens refusés/approuvés | Suivi de performance | ⭐ |
| T6 | **Géolocalisation des missions** | Carte des biens à vérifier avec optimisations d'itinéraire | Efficacité terrain | ⭐⭐ |
| T7 | **Mode hors-ligne pour les inspections** | Checklist téléchargeable, fonctionne sans réseau, sync automatique | Terrain (Afrique) | ⭐⭐⭐ |
| T8 | **Messagerie directe avec les propriétaires** | Canal dédié TC ↔ propriétaire pour échanges sur les vérifications | Fluidité | ⭐ |
| T9 | **Notation des propriétaires** | Score de fiabilité basé sur les interactions et l'historique | Aide à la décision | ⭐⭐ |

### 1.5 Admin

| # | Fonctionnalité | Description | Valeur ajoutée | Effort |
|---|---|---|---|---|
| E1 | **Dashboard revenus plateforme** | KPIs: CA, commissions, abonnements, croissance | Pilotage business | ⭐⭐ |
| E2 | **Métriques de croissance** | Nouveaux utilisateurs/rôle, biens publiés, locations signées | Suivi acquisition | ⭐ |
| E3 | **Carte des utilisateurs / biens** | Cartographie des utilisateurs et annonces par zone géographique | Vision territoriale | ⭐⭐ |
| E4 | **Gestion des contenus (CMS)** | FAQ, blog, pages statiques, CGU, mentions légales éditables | Autonomie marketing | ⭐⭐ |
| E5 | **Feature flags / A/B testing** | Activation/désactivation de fonctionnalités par segment d'utilisateurs | Déploiement progressif | ⭐⭐⭐ |
| E6 | **Export de données** | Export CSV/Excel des utilisateurs, biens, transactions | Analyse externe | ⭐ |
| E7 | **Logs d'activité avancés** | Recherche, filtres, export des audit logs | Conformité, investigation | ⭐⭐ |
| E8 | **Gestion des abonnements** | Plans tarifaires (freemium, pro, agence), facturation récurrente | Monétisation | ⭐⭐⭐ |
| E9 | **Configuration des frais de service** | Commission plateforme modulable par type de transaction | Flexibilité business | ⭐ |
| E10 | **Système de support intégré** | Tickets support, assignation, historique client | Service client | ⭐⭐⭐ |
| E11 | **Modération des avis** | Validation/refus des avis laissés sur les biens | Qualité plateforme | ⭐ |
| E12 | **Rapports d'activité programmés** | Envoi automatique par email des rapports (quotidiens, hebdomadaires) | Reporting régulier | ⭐⭐ |
| E13 | **Santé du système** | Monitoring: uptime, latence Supabase, erreurs API | Maintenance | ⭐⭐ |

### 1.6 Multi-rôle & Transversal

| # | Fonctionnalité | Description | Rôles | Effort |
|---|---|---|---|---|
| X1 | **Centre d'aide / Base de connaissances** | FAQ dynamique, articles, tutoriels vidéo | Tous | ⭐⭐ |
| X2 | **Chatbot avancé (IA)** | Support conversationnel basé sur l'IA (actuel: Suta simple) | Tous | ⭐⭐⭐ |
| X3 | **Notifications push mobiles** | Notifications push via Capacitor (actuel: in-app seulement) | Tous | ⭐⭐ |
| X4 | **Emails transactionnels** | Confirmation, rappels, relances par email via SendGrid/Mailgun | Tous | ⭐⭐ |
| X5 | **Onboarding progressif** | Parcours de découverte guidé selon le rôle lors de la première connexion | Tous | ⭐⭐ |
| X6 | **Fil d'activité global** | Timeline centralisée de toutes les actions récentes sur le compte | Tous | ⭐⭐ |
| X7 | **Scores de confiance** | Score de fiabilité par utilisateur basé sur l'historique, les validations, les avis | Tous | ⭐⭐⭐ |
| X8 | **Programme de parrainage** | Invitation de nouveaux utilisateurs avec récompenses | Tous | ⭐⭐ |
| X9 | **Thème sombre complet** | Dark mode cohérent sur tous les composants (existant: partiel) | Tous | ⭐ |
| X10 | **Accessibilité (a11y)** | Navigation clavier, lecteur d'écran, contrastes, aria-labels | Tous | ⭐⭐⭐ |
| X11 | **Impression / Export PDF** | Impression des pages de détail, contrats, quittances | Tous | ⭐ |
| X12 | **Paramètres de confidentialité** | Contrôle des données partagées, visibilité du profil | Tous | ⭐ |
| X13 | **Suppression de compte** | Workflow de suppression avec export des données | Tous | ⭐ |
| X14 | **Journalisation complète** | Audit de toutes les actions sensibles (connexions, paiements, signatures) | Tous | ⭐⭐ |

---

## 2. Par Domaine Fonctionnel

### 2.1 Paiements & Finance

| # | Fonctionnalité | Priorité |
|---|---|---|
| F1 | **Paiement récurrent automatique** | 🟠 |
| F2 | **Prélèvement automatique (mandat SEPA / mobile money)** | 🟡 |
| F3 | **Système d'escrow (séquestre)** pour dépôt de garantie | 🟠 |
| F4 | **Gestion des cautions (dépôt, restitution, intérêts)** | 🟠 |
| F5 | **Factures et reçus automatiques** | 🟢 |
| F6 | **Tableau de bord financier multi-rôle** | 🟠 |
| F7 | **Export comptable (compatible Etafi / Sage)** | 🟡 |
| F8 | **Gestion des taxes foncières et THLV (Côte d'Ivoire)** | 🟡 |
| F9 | **Paiement par carte bancaire (Stripe)** | 🟠 |
| F10 | **Portefeuille virtuel (Mon Toit Wallet)** | 🟡 |
| F11 | **Split de paiement (colocation)** | 🟡 |

### 2.2 Communication & Messagerie

| # | Fonctionnalité | Priorité |
|---|---|---|
| C1 | **Intégration WhatsApp Business API** | 🔴 |
| C2 | **Modèles de messages pré-écrits** | 🟢 |
| C3 | **Réponses automatiques programmées** | 🟢 |
| C4 | **Messages vocaux** | 🟢 |
| C5 | **Partage de photos/pièces jointes dans les messages** (amélioration) | 🟢 |
| C6 | **Notifications push sur mobile** | 🔴 |
| C7 | **Emails transactionnels (SendGrid / Mailgun)** | 🟠 |
| C8 | **SMS transactionnels via ANSUT (existant: partiel)** | 🔴 |
| C9 | **Newsletter / email marketing** | 🟠 |
| C10 | **Chat en direct avec le support** | 🟠 |

### 2.3 Recherche & Découverte

| # | Fonctionnalité | Priorité |
|---|---|---|
| R1 | **Recherche par carte interactive avancée** | 🟠 |
| R2 | **Filtres avancés (étage, meublé, parking, climatisation, etc.)** | 🟢 |
| R3 | **Recherche par mots-clés (adresse, quartier, point d'intérêt)** | 🟢 |
| R4 | **Suggestions automatiques (autocomplete)** | 🟢 |
| R5 | **Géolocalisation des utilisateurs (trouver des biens près de moi)** | 🟢 |
| R6 | **Alertes prix / surface (quand le loyer baisse)** | 🟢 |
| R7 | **Biens similaires suggérés** | 🟢 |
| R8 | **Historique de recherche récent** | 🟢 |
| R9 | **Tagging automatique des biens (IA par description)** | 🟡 |
| R10 | **Comparateur de biens** | 🟠 |

### 2.4 Documents & Légal

| # | Fonctionnalité | Priorité |
|---|---|---|
| D1 | **Générateur de baux PDF** avec clauses légales Côte d'Ivoire | 🟠 |
| D2 | **Bibliothèque de templates juridiques** (bail, mandat, quittance, préavis) | 🟠 |
| D3 | **Signature électronique pour tous les documents** (existant: CryptoNeo partiel) | 🟠 |
| D4 | **Cachet numérique / horodatage** | 🟡 |
| D5 | **Archivage légal des documents** | 🟠 |
| D6 | **Partage sécurisé de documents** (lien temporaire, accès contrôlé) | 🟢 |
| D7 | **Scanner de documents intégré** (via Capacitor Camera) | 🟢 |
| D8 | **Reconnaissance automatique des pièces d'identité** | 🟡 |

### 2.5 Mobile & Offline

| # | Fonctionnalité | Priorité |
|---|---|---|
| M1 | **Mode hors-ligne complet** (consultation des biens, messages en cache) | 🟠 |
| M2 | **Service Worker / PWA** (installation sur l'écran d'accueil) | 🟡 |
| M3 | **Notifications push Firebase** | 🔴 |
| M4 | **Widget Android** (dernières annonces, loyer à payer) | 🟢 |
| M5 | **Intégration agenda (Google Calendar / iOS Calendar)** | 🟢 |
| M6 | **Partage via les sheets Android/iOS** | 🟢 |
| M7 | **Deep linking / Universal Links** | 🟠 |
| M8 | **Biométrie (empreinte, Face ID) pour connexion** | 🟠 |
| M9 | **Synchronisation offline des états des lieux** | 🟠 |
| M10 | **Optimisation des images pour les connexions lentes** | 🟠 |

### 2.6 Internationalisation

| # | Fonctionnalité | Priorité |
|---|---|---|
| I1 | **Français + Anglais** (next-intl installé mais pas configuré) | 🟠 |
| I2 | **Langues locales africaines** (Dioula, Baoulé, Bété — au moins en audio/voix) | 🟡 |
| I3 | **Formats régionaux** (date, devise FCFA, téléphone) | 🟢 |
| I4 | **Adaptation des CGU par pays** | 🟡 |
| I5 | **Support multi-pays** (Côte d'Ivoire → Sénégal, Cameroun, etc.) | 🟡 |

---

## 3. Par Priorité Stratégique

### 3.1 🔴 Immédiat (Sprint 1-2)

*Fonctionnalités à fort impact, effort faible à moyen*

| # | Fonctionnalité | Effort | Impact estimé |
|---|---|---|---|
| 1 | **WhatsApp Business API** — notifications, partage d'annonces, FAQ automatisée | 2 jours | 🟢 Canal #1 en Afrique |
| 2 | **Notifications push mobiles** — Capacitor Push | 3 jours | 🟢 Rétention ×3 |
| 3 | **SMS transactionnels** (via ANSUT) — confirmer les OTP, paiements, visites | 2 jours | 🟢 Couverture offline |
| 4 | **Alertes de recherche personnalisées** | 2 jours | 🟢 Réengagement |
| 5 | **Filtres avancés** (meublé, étage, parking, climatisation, meubles) | 1 jour | 🟢 UX recherche |
| 6 | **Partage d'annonce vers WhatsApp** | 0.5 jour | 🟢 Viralité rapide |
| 7 | **Dépôt de dossier en ligne** (candidature locataire) | 3 jours | 🟢 Conversion |
| 8 | **Quittances de loyer numériques** | 2 jours | 🟢 Service pro |
| 9 | **Sauvegarde de recherches + Historique récent** | 1 jour | 🟢 UX |
| 10 | **Guide de quartier / Carte de voisinage** | 3 jours | 🟢 Décision éclairée |
| 11 | **Onboarding progressif par rôle** | 2 jours | 🟢 Activation utilisateur |
| 12 | **Fil d'activité global** | 2 jours | 🟢 Transparence |

### 3.2 🟠 Court terme (Sprint 3-5)

*Fonctionnalités structurantes, différenciatrices*

| # | Fonctionnalité | Effort | Impact estimé |
|---|---|---|---|
| 13 | **Statut de candidature en temps réel** | 2 jours | 🟢 Transparence |
| 14 | **Paiement du loyer en ligne** (Orange Money, MTN MoMo) | 5 jours | 🟢🔴 Killer feature |
| 15 | **Relances automatiques impayés** | 2 jours | 🟢🔴 Réduction turnover |
| 16 | **Tableau de bord financier propriétaire** | 3 jours | 🟢 Pilotage |
| 17 | **Système d'escrow pour dépôt de garantie** | 5 jours | 🟢🔴 Confiance |
| 18 | **Estimation locative IA** | 5 jours | 🟢🔴 Pricing optimal |
| 19 | **Mode hors-ligne des biens consultés** | 4 jours | 🟢🔴 Afrique |
| 20 | **Comparateur de biens** | 2 jours | 🟢 Décision |
| 21 | **Itinéraire / Temps de trajet** | 2 jours | 🟢 Contexte |
| 22 | **Programme de parrainage** | 3 jours | 🟢 Acquisition |
| 23 | **Export de données (CSV/Excel)** | 2 jours | 🟢 Conformité |
| 24 | **Gestion des cautions** | 3 jours | 🟢 Transparence |
| 25 | **Visites virtuelles (photos 360°)** | 5 jours | 🟢🔴 Diaspora |
| 26 | **Blog / Guides / Actualités** | 3 jours | 🟢 SEO + confiance |
| 27 | **Emails transactionnels** (confirmation, rappels) | 3 jours | 🟢 Notification canal B |

### 3.3 🟡 Moyen terme (Sprint 6-10)

*Fonctionnalités de monétisation, scale et pro*

| # | Fonctionnalité | Effort | Partie prenante |
|---|---|---|---|
| 28 | **CRM Agent / Pipeline commercial** | 5 jours | Agence |
| 29 | **Campagnes email/SMS automatisées** | 3 jours | Agence |
| 30 | **Syndication d'annonces** (Jinka, Facebook, etc.) | 10 jours | Agence, Proprio |
| 31 | **Site vitrine agence personnalisable** | 5 jours | Agence |
| 32 | **Portail client agence** | 5 jours | Agence |
| 33 | **Gestion des abonnements / Plans tarifaires** | 8 jours | Admin (monétisation) |
| 34 | **Système de support intégré (tickets)** | 5 jours | Tous |
| 35 | **Colocation / Roommate Matching** | 8 jours | Locataire (segment) |
| 36 | **Modèles de baux personnalisables** | 3 jours | Proprio, Agence |
| 37 | **Dashboard revenus plateforme** | 3 jours | Admin |
| 38 | **Centre d'aide / Base de connaissances** | 5 jours | Tous |
| 39 | **Signature électronique des mandats** (CryptoNeo) | 3 jours | Agence |
| 40 | **Géolocalisation des missions TC** | 3 jours | TC |

### 3.4 🟢 Long terme (Sprint 11+)

*Fonctionnalités avancées ou d'expansion*

| # | Fonctionnalité | Horizon |
|---|---|---|
| 41 | **Scoring du locataire** (credit scoring alternatif) | H2 |
| 42 | **Rent-to-own (location-accession)** | H2 |
| 43 | **Place de marché services (agents, artisans, assurances)** | H2 |
| 44 | **Multi-pays (Sénégal, Cameroun, Burkina)** | H2 |
| 45 | **Intégration USSD** (feature phones) | H2 |
| 46 | **A/B testing / Feature flags** | H2 |
| 47 | **Chatbot IA avancé** (GPT custom) | H2 |
| 48 | **Programme de fidélité / Points** | H2 |
| 49 | **API publique pour intégrateurs tiers** | H2 |
| 50 | **Place de marché d'assurances** (PNO, GLI, MRH) | H2 |

---

## 4. Fonctionnalités Spécifiques Marché Africain

Ces fonctionnalités sont particulièrement adaptées au marché ivoirien et ouest-africain :

### 4.1 Connectivité & Accessibilité

| # | Fonctionnalité | Justification |
|---|---|---|
| AF1 | **Compression d'images adaptative** | Connexions 3G/4G instables → charger les images en basse résolution d'abord |
| AF2 | **Mode hors-ligne intelligent** | Mettre en cache les dernières annonces consultées pour consultation sans réseau |
| AF3 | **Poids des pages optimisé** | < 500KB par page pour chargement rapide sur réseau lent |
| AF4 | **SMS comme fallback** | Quand les notifications push ne passent pas, envoyer un SMS |
| AF5 | **Application légère** (< 20MB APK) | Les utilisateurs ont souvent peu de stockage |

### 4.2 Paiements & Mobile Money

| # | Fonctionnalité | Justification |
|---|---|---|
| AF6 | **Orange Money** | #1 en Côte d'Ivoire |
| AF7 | **MTN Mobile Money** | #2 en Côte d'Ivoire |
| AF8 | **Wave** | Émergent en Afrique de l'Ouest |
| AF9 | **Moov Money** | Présent en Côte d'Ivoire |
| AF10 | **Paiement par dépôt cash en agence** | Les utilisateurs sans smartphone peuvent payer en agence partenaire |
| AF11 | **Escrow (séquestre) mobile money** | Sécuriser le dépôt de garantie via séquestre mobile money |

### 4.3 Social & Viralité

| # | Fonctionnalité | Justification |
|---|---|---|
| AF12 | **WhatsApp Business API** | 95% des utilisateurs ont WhatsApp |
| AF13 | **Partage d'annonce vers WhatsApp avec template** | Message formaté : photos + prix + lien |
| AF14 | **Partage de contact agent/TC via WhatsApp** | Recommandation sociale |
| AF15 | **Invitation de parrainage via WhatsApp** | Canal #1 de bouche-à-oreille digital |
| AF16 | **Groupe WhatsApp immobilier intégré** | Communauté autour d'un quartier ou type de bien |

### 4.4 Identité & Confiance

| # | Fonctionnalité | Justification |
|---|---|---|
| AF17 | **Vérification d'identité via ONECI** (existant) | Pièce d'identité nationale |
| AF18 | **Vérification via CNPS** | Pour les salariés (preuve de revenus) |
| AF19 | **Vérification via avis d'imposition** | Preuve de revenus alternative |
| AF20 | **Attestation d'hébergement numérique** | Pour les locataires sans bail |
| AF21 | **Casier judiciaire en ligne** | Pour les locations premium |
| AF22 | **Garantie VISALE / Loca-Pass adapté** | Solution de caution locative |

### 4.5 Marché & Contenu Local

| # | Fonctionnalité | Justification |
|---|---|---|
| AF23 | **Guide des quartiers d'Abidjan** | Cocody, Marcory, Treichville, Yopougon, etc. — transport, sécurité, commerces |
| AF24 | **Prix au m² par quartier** | Transparence du marché |
| AF25 | **Lexique immobilier en français simple** | Beaucoup d'utilisateurs ne connaissent pas les termes juridiques |
| AF26 | **Conseils location Côte d'Ivoire** | Assurance GLI, caution, état des lieux, préavis |
| AF27 | **Comparaison loyer / surface par zone** | Aide à la négociation |
| AF28 | **Informations sur les charges locatives** | Eau, électricité, ordures — spécificités ivoiriennes |

---

## Annexe A : Fonctionnalités Déjà Existantes

*Ce qu'il ne faut PAS recréer*

| Fonctionnalité | Commentaire |
|---|---|
| ✅ Inscription/connexion avec OTP SMS/Email | Fonctionnel |
| ✅ 5 rôles utilisateur avec dashboards dédiés | Solide |
| ✅ CRUD propriétés avec images | Complet |
| ✅ Messagerie entre utilisateurs | ✅ |
| ✅ Visites (demande + planification) | ✅ |
| ✅ Candidatures (rental files) | ✅ |
| ✅ Baux / Contrats de location | ✅ |
| ✅ Paiements Intouch (Orange Money, MTN) | Fonctionnel — à étendre |
| ✅ Signature électronique CryptoNeo | Fonctionnel — à étendre |
| ✅ États des lieux numériques | ✅ |
| ✅ Notifications en temps réel (Supabase Realtime) | ✅ |
| ✅ Certifications utilisateur | ✅ |
| ✅ Vérification ONECI | ✅ |
| ✅ Favoris | ✅ |
| ✅ Maintenance / Demandes de réparation | ✅ |
| ✅ Mandats de gestion (agence) | ✅ |
| ✅ Dashboard Admin (utilisateurs, modération) | ✅ |
| ✅ Dashboard TC (vérifications, missions, litiges) | ✅ |
| ✅ Dashboard Agence (portefeuille, clients) | ✅ |
| ✅ Chatbot Suta | Basique — à améliorer |
| ✅ Dark mode | À compléter |
| ✅ Application mobile (Capacitor) | ✅ |
| ✅ Rate limiter | ✅ |
| ✅ Audit logs | ✅ |
| ✅ Support hors-ligne (bannière offline) | Partiel — à améliorer |

---

## Annexe B : Métriques Clés à Suivre

*Pour prioriser les features, suivre ces KPIs*

| Métrique | Pourquoi |
|---|---|
| **Taux d'activation** (signup → première action) | L'onboarding fait-il son travail ? |
| **Taux de rétention J7 / J30** | Les utilisateurs reviennent-ils ? |
| **Taux de conversion candidature → bail signé** | Le funnel location est-il fluide ? |
| **Taux de complétion de profil** | Le onboarding progressif est-il efficace ? |
| **Nombre de visites / bien** | L'engagement est-il au rendez-vous ? |
| **Temps moyen avant première action** | L'UX est-elle intuitive ? |
| **Taux de rebond sur la recherche** | Les résultats sont-ils pertinents ? |
| **Taux de partage WhatsApp** | La viralité fonctionne-t-elle ? |
| **NPS par rôle** | Les utilisateurs recommandent-ils la plateforme ? |

---

> **Document généré le 26 mai 2026**
> **Prochaine révision : après implémentation des features Sprint 1-2**
