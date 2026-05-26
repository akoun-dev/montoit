# Fiches de Test — Mon Toit

> **Mot de passe commun :** `Test1234!`
> **URL :** http://localhost:3000 (ou l'URL de déploiement)

---

## 1. Locataire — Moussa Koné

| Champ | Valeur |
|-------|--------|
| **Email** | locataire@montoit.ci |
| **Password** | Test1234! |
| **Nom** | Moussa Koné |
| **Rôle** | Locataire |

### Fonctionnalités à tester

| # | Section | Cas de test | Résultat attendu |
|---|---------|-------------|------------------|
| 1.1 | **Connexion** | Se connecter avec email + mot de passe | Redirection vers le dashboard locataire |
| 1.2 | **Dashboard (Mon Espace)** | Visualiser le tableau de bord | Voir le récapitulatif : baux, paiements, alertes, documents |
| 1.3 | **Chercher un bien** | Parcourir la liste des biens disponibles | Voir les propriétés avec photos, prix, localisation |
| 1.4 | **Chercher un bien** | Filtrer par commune / prix / type | Les résultats se filtrent correctement |
| 1.5 | **Chercher un bien** | Cliquer sur un bien → Détail du bien | Voir les infos détaillées, galerie photos, plan, équipements |
| 1.6 | **Favoris** | Ajouter un bien en favoris | Le bien apparaît dans "Mes Favoris" |
| 1.7 | **Favoris** | Retirer un bien des favoris | Le bien disparaît de la liste |
| 1.8 | **Candidatures** | Soumettre une candidature pour un bien | Création d'un dossier locatif en statut DRAFT |
| 1.9 | **Candidatures** | Compléter le dossier locatif (upload pièces) | Statut passe en SUBMITTED |
| 1.10 | **Candidatures** | Voir le statut d'une candidature | Statut affiché : EN ATTENTE / VALIDÉ / REJETÉ |
| 1.11 | **Visites** | Demander une visite pour un bien | Demande créée avec statut PENDING |
| 1.12 | **Visites** | Voir les demandes de visite | Liste de toutes ses demandes avec leurs statuts |
| 1.13 | **Visites** | Annuler une visite en attente | Statut passe à CANCELLED |
| 1.14 | **Mes locations (baux)** | Voir la liste des baux | Affiche les baux actifs, en attente, terminés |
| 1.15 | **Mes locations** | Voir le détail d'un bail | Infos : loyer, charges, dates, contrat PDF |
| 1.16 | **Mes locations** | Signer un bail électronique (OTP) | Processus de signature via CryptoNeo |
| 1.17 | **Paiements** | Voir l'historique des paiements | Liste des paiements avec statuts |
| 1.18 | **Paiements** | Payer un loyer | Paiement initié via le système de paiement |
| 1.19 | **Paiements** | Voir une alerte de loyer impayé | Badge rouge "Mes locations" si impayé |
| 1.20 | **Messages** | Voir ses conversations | Liste des conversations avec propriétaire/agence |
| 1.21 | **Messages** | Envoyer un message | Message envoyé et visible dans la conversation |
| 1.22 | **Litiges** | Créer un litige | Nouveau litige créé |
| 1.23 | **Litiges** | Voir ses litiges | Liste des litiges avec statuts |
| 1.24 | **Notifications** | Voir ses notifications | Liste des notifications (visites, messages, etc.) |
| 1.25 | **Maintenance** | Créer une demande de maintenance | Demande créée en statut PENDING |
| 1.26 | **Maintenance** | Voir les demandes de maintenance | Liste de ses demandes |
| 1.27 | **Avis** | Donner un avis sur un propriétaire/bien | Avis publié |
| 1.28 | **Paramètres** | Modifier son profil (nom, email, téléphone) | Modifications enregistrées |
| 1.29 | **Paramètres** | Changer son mot de passe | Mot de passe mis à jour |
| 1.30 | **Paramètres** | Changer son rôle en "Propriétaire" | Possibilité de basculer en mode Propriétaire |

---

## 2. Propriétaire — Kouadio Yao

| Champ | Valeur |
|-------|--------|
| **Email** | proprietaire@montoit.ci |
| **Password** | Test1234! |
| **Nom** | Kouadio Yao |
| **Rôle** | Propriétaire |

### Fonctionnalités à tester

| # | Section | Cas de test | Résultat attendu |
|---|---------|-------------|------------------|
| 2.1 | **Dashboard (Mon Espace)** | Visualiser le tableau de bord | Stats : biens, revenus, visites, loyers impayés |
| 2.2 | **Mes biens** | Voir la liste de ses biens | Liste de toutes ses propriétés avec statuts |
| 2.3 | **Mes biens** | Ajouter un bien (formulaire complet) | Propriété créée en statut PENDING_VERIFICATION ou ACTIVE |
| 2.4 | **Mes biens** | Modifier un bien | Modifications enregistrées |
| 2.5 | **Mes biens** | Désactiver/Activer un bien | Statut mis à jour |
| 2.6 | **Mes locataires** | Voir la liste des locataires | Liste des locataires actuels avec leurs baux |
| 2.7 | **Mes locataires** | Voir le détail d'un locataire | Infos : documents, paiements, historique |
| 2.8 | **Demandes de visite** | Voir les demandes reçues | Liste des demandes pour ses biens |
| 2.9 | **Demandes de visite** | Accepter une demande | Statut passe à APPROVED, notification envoyée |
| 2.10 | **Demandes de visite** | Refuser une demande | Statut passe à REJECTED |
| 2.11 | **Demandes de visite** | Proposer une contre-proposition (date) | Visite mise à jour avec nouvelle date |
| 2.12 | **Mes candidatures** | Voir les dossiers locatifs reçus | Liste des candidatures avec statuts |
| 2.13 | **Mes candidatures** | Valider/Rejeter une candidature | Dossier validé/rejeté |
| 2.14 | **Mes baux** | Voir les baux de ses biens | Liste des baux (actifs, en attente, terminés) |
| 2.15 | **Mes baux** | Créer un bail pour un locataire | Bail créé en statut PENDING_SIGNATURE |
| 2.16 | **Mes baux** | Signer un bail électronique (OTP + SMS) | Signature propriétaire apposée |
| 2.17 | **Mandats** | Voir ses mandats de gestion | Liste des mandats avec agences |
| 2.18 | **Mandats** | Créer un mandat avec une agence | Mandat créé en statut PENDING |
| 2.19 | **Maintenance** | Voir les demandes de maintenance | Liste des demandes pour ses biens |
| 2.20 | **Maintenance** | Changer le statut d'une demande | Statut passe de PENDING → IN_PROGRESS → RESOLVED |
| 2.21 | **Paiements** | Voir les paiements reçus | Historique des paiements avec statuts |
| 2.22 | **Paiements** | Déclarer un impayé | Statut du paiement mis à jour |
| 2.23 | **Finances** | Voir les revenus globaux | Graphiques et chiffres : revenus mensuels, annuels |
| 2.24 | **Analytics** | Voir les statistiques | Taux d'occupation, performance locative |
| 2.25 | **Messages** | Échanger avec ses locataires | Messagerie fonctionnelle |
| 2.26 | **Litiges** | Voir les litiges concernant ses biens | Liste des litiges avec détails |
| 2.27 | **Notifications** | Recevoir une notification de candidature | Notification visible |
| 2.28 | **Avis** | Voir les avis reçus | Avis postés par ses locataires |
| 2.29 | **Paramètres** | Modifier son profil | Changements enregistrés |

---

## 3. Agence — Immobilier Cocody

| Champ | Valeur |
|-------|--------|
| **Email** | agence@montoit.ci |
| **Password** | Test1234! |
| **Nom** | Immobilier Cocody |
| **Rôle** | Agence |

### Fonctionnalités à tester

| # | Section | Cas de test | Résultat attendu |
|---|---------|-------------|------------------|
| 3.1 | **Dashboard (Mon Espace)** | Visualiser le tableau de bord | Stats : portefeuille, pipeline, visites du jour, impayés |
| 3.2 | **Nos biens (Portfolio)** | Voir la liste des biens gérés | Liste complète des biens de l'agence |
| 3.3 | **Nos biens** | Ajouter un bien / mandat | Nouveau bien créé |
| 3.4 | **Nos biens** | Modifier la fiche d'un bien | Modifications enregistrées |
| 3.5 | **Mandats** | Voir les mandats de gestion | Liste des mandats avec propriétaires |
| 3.6 | **Mandats** | Accepter/Refuser un mandat | Statut du mandat mis à jour |
| 3.7 | **Mandats** | Créer un mandat depuis un propriétaire | Mandat créé |
| 3.8 | **Candidatures** | Voir les candidatures reçues | Liste des dossiers pour les biens gérés |
| 3.9 | **Candidatures** | Analyser et valider/rejeter | Dossier mis à jour |
| 3.10 | **Visites** | Planifier/gérer les visites | Calendrier et gestion des visites |
| 3.11 | **Contrats** | Créer un bail pour un locataire | Bail créé, signature électronique initiée |
| 3.12 | **Contrats** | Suivre les signatures | Statut de signature mis à jour |
| 3.13 | **Équipe** | Voir la liste des agents | Liste des agents avec rôles |
| 3.14 | **Équipe** | Ajouter un agent | Nouvel agent créé |
| 3.15 | **Équipe** | Modifier les droits d'un agent | Rôle mis à jour (ADMIN/AGENT/READ_ONLY) |
| 3.16 | **Finances** | Voir les revenus globaux | Chiffre d'affaires, commissions |
| 3.17 | **Analytics** | Voir les indicateurs de performance | KPIs, statistiques |
| 3.18 | **Communication** | Messagerie centralisée | Voir/filtrer conversations (propriétaires/locataires) |
| 3.19 | **Marketing** | Outils marketing | Publications, mise en avant des biens |
| 3.20 | **Dossiers clients** | Gérer les dossiers propriétaires | Accès aux documents |
| 3.21 | **Litiges** | Gérer les litiges | Créer/suivre les litiges |
| 3.22 | **Paramètres** | Configurer l'agence | Profil, informations |

---

## 4. Tiers de Confiance — Aya Diabaté

| Champ | Valeur |
|-------|--------|
| **Email** | tc@montoit.ci |
| **Password** | Test1234! |
| **Nom** | Aya Diabaté |
| **Rôle** | Tiers de Confiance |

### Fonctionnalités à tester

| # | Section | Cas de test | Résultat attendu |
|---|---------|-------------|------------------|
| 4.1 | **Dashboard (Mon Espace)** | Visualiser le tableau de bord | Stats : validations, agents, alertes fraude, SLA |
| 4.2 | **Tous les biens** | Voir la liste complète des biens | Toutes les propriétés de la plateforme |
| 4.3 | **Vérification biens** | Voir les biens en attente de vérification | Liste des biens PENDING_VERIFICATION |
| 4.4 | **Vérification biens** | Valider un bien après vérification | Bien passe en ACTIVE |
| 4.5 | **Vérification biens** | Rejeter un bien avec motif | Bien rejeté, notification au propriétaire |
| 4.6 | **Dossiers de validation** | Voir les dossiers en attente | Files d'attente : dossiers locatifs, propriétaires, agences |
| 4.7 | **Dossiers locatifs** | Valider un dossier locatif | Dossier validé (scoring, pièces conformes) |
| 4.8 | **Dossiers locatifs** | Rejeter un dossier avec commentaire | Dossier rejeté |
| 4.9 | **Vérification ONECI** | Vérifier l'identité d'un utilisateur via ONECI | Vérification effectuée |
| 4.10 | **Utilisateurs** | Voir la liste des utilisateurs | Liste avec filtres, recherche |
| 4.11 | **Certifications** | Gérer les certifications des biens/agences | Certification créée/modifiée |
| 4.12 | **Rapports d'état des lieux** | Créer un rapport d'entrée/sortie | Rapport créé avec photos, commentaires |
| 4.13 | **Rapports d'état des lieux** | Consulter les rapports existants | Liste des rapports |
| 4.14 | **Agents** | Créer/gérer les agents de vérification | Agent créé/assigné |
| 4.15 | **Missions** | Créer une mission pour un agent | Mission avec lieu, date, instructions |
| 4.16 | **Missions** | Suivre les missions en cours | Statut de la mission mis à jour |
| 4.17 | **Alertes fraude** | Voir les alertes de fraude | Liste des alertes avec niveaux de risque |
| 4.18 | **Alertes fraude** | Marquer une alerte comme traitée | Statut mis à jour |
| 4.19 | **Messagerie TC** | Échanger avec les utilisateurs | Messagerie interne |
| 4.20 | **Suivi SLA** | Voir les indicateurs de performance SLA | Temps de traitement, objectifs |
| 4.21 | **Litiges** | Gérer les litiges assignés | Intervention sur les litiges |
| 4.22 | **Documentation** | Accéder au centre de documentation | Guides, procédures |
| 4.23 | **Notifications** | Recevoir les alertes | Notifications fonctionnelles |
| 4.24 | **Paramètres** | Modifier son profil | Changements enregistrés |

---

## 5. Administrateur — Admin Toit

| Champ | Valeur |
|-------|--------|
| **Email** | admin@montoit.ci |
| **Password** | Test1234! |
| **Nom** | Admin Toit |
| **Rôle** | Admin |

### Fonctionnalités à tester

| # | Section | Cas de test | Résultat attendu |
|---|---------|-------------|------------------|
| 5.1 | **Dashboard (Mon Espace)** | Visualiser le tableau de bord | Stats globales : utilisateurs, biens, litiges, système |
| 5.2 | **Utilisateurs** | Voir tous les utilisateurs | Liste complète avec pagination, recherche, filtres |
| 5.3 | **Utilisateurs** | Modifier un utilisateur (nom, rôle, statut) | Utilisateur mis à jour |
| 5.4 | **Utilisateurs** | Désactiver/Activer un compte | Compte désactivé/activé |
| 5.5 | **Modération contenu** | Voir les biens à modérer | File d'attente de modération |
| 5.6 | **Modération contenu** | Approuver un bien | Bien approuvé |
| 5.7 | **Modération contenu** | Rejeter un bien avec motif | Bien rejeté |
| 5.8 | **Tiers de Confiance** | Voir la liste des TC | Liste des comptes TC |
| 5.9 | **Tiers de Confiance** | Ajouter/Supprimer un TC | Compte TC créé/supprimé |
| 5.10 | **Signalements** | Voir les signalements utilisateurs | Liste des signalements |
| 5.11 | **Signalements** | Traiter un signalement | Statut mis à jour |
| 5.12 | **Litiges** | Voir tous les litiges de la plateforme | Liste complète des litiges |
| 5.13 | **Litiges** | Intervenir sur un litige | Intervention enregistrée |
| 5.14 | **Système** | Voir l'état du système | Indicateurs : uptime, performances, erreurs |
| 5.15 | **Sécurité** | Voir les logs de connexion, sessions actives | Données de sécurité affichées |
| 5.16 | **Rapports** | Générer des rapports (utilisateurs, transactions) | Rapports générés |
| 5.17 | **Configuration** | Modifier les paramètres généraux | Paramètres mis à jour (frais, limites, etc.) |
| 5.18 | **Configuration** | Configurer les seuils et règles | Seuils appliqués |
| 5.19 | **Sauvegardes** | Voir l'historique des sauvegardes | Liste des backups |
| 5.20 | **Sauvegardes** | Déclencher une sauvegarde manuelle | Sauvegarde en cours/terminée |
| 5.21 | **Notifications** | Paramétrer les notifications globales | Configuration enregistrée |

---

## Scénarios transversaux (inter-comptes)

| # | Scénario | Étapes | Résultat attendu |
|---|----------|--------|------------------|
| T1 | **Candidature → Visite → Bail → Signature → Paiement** | 1. Locataire candidate → 2. Propriétaire valide → 3. Locataire demande visite → 4. Propriétaire accepte → 5. Bail créé → 6. Les deux signent → 7. Locataire paie | Cycle complet fonctionnel |
| T2 | **Mandat Agence** | 1. Propriétaire crée mandat pour agence → 2. Agence accepte → 3. Agence publie le bien → 4. Locataire postule → 5. Agence gère le dossier | Gestion déléguée OK |
| T3 | **Vérification TC** | 1. Propriétaire publie un bien → 2. TC vérifie et valide → 3. Bien devient ACTIVE → 4. Locataire peut le voir | Circuit de validation OK |
| T4 | **Litige + Admin** | 1. Locataire crée un litige → 2. Propriétaire répond → 3. TC tente médiation → 4. Admin intervient si nécessaire | Résolution de litige OK |
| T5 | **Maintenance** | 1. Locataire signale un problème → 2. Propriétaire change statut → 3. Résolu | Cycle maintenance OK |
