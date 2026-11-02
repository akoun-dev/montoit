// Données du checklist — source : analyse-acteurs/, .ai/ACTORS.md, README (branche 4.0.0)
// s: EXISTANTE | PARTIELLE | MANQUANTE | ACONFIRMER

const ACTORS = [
  {
    title: "Visiteur (public non authentifié)",
    mission: "Consulter le catalogue public des biens, les avis, les pages légales et créer un compte. La lecture publique porte sur /api/properties et /api/reviews ; l'inscription propose les rôles LOCATAIRE, PROPRIETAIRE, AGENCE et TIERS_CONFIANCE (jamais ADMIN).",
    screens: "24 écrans (home 19, auth 5)",
    categories: [
      {
        title: "Consultation publique",
        items: [
          { f: "Catalogue public des biens (liste, filtres, tri)", d: "Lecture publique /api/properties + /api/reviews", s: "EXISTANTE" },
          { f: "Fiche détaillée d'un bien (photos, caractéristiques, carte)", d: "Composants home + cartographie Leaflet", s: "EXISTANTE" },
          { f: "Consultation des avis publics sur les biens", d: "Ratings en lecture publique", s: "EXISTANTE" },
          { f: "Pages institutionnelles (CGU, confidentialité, contact)", d: "Section home dédiée", s: "EXISTANTE" },
          { f: "Découverte de l'assistant conversationnel SUTA", d: "Azure OpenAI, appel côté serveur uniquement", s: "ACONFIRMER" },
        ],
      },
      {
        title: "Accès et inscription",
        items: [
          { f: "Inscription avec choix de rôle (Locataire, Propriétaire, Agence, Tiers de confiance)", d: "/api/auth/register — whitelist serveur du rôle à durcir (risque d'escalade ADMIN)", s: "PARTIELLE" },
          { f: "Connexion par email / mot de passe", d: "Supabase Auth", s: "EXISTANTE" },
          { f: "Connexion par téléphone via SMS OTP", d: "Sessions SMS, cookie httpOnly, table sessions", s: "EXISTANTE" },
          { f: "Vérification email / téléphone (OTP)", d: "Table otp_codes + ANSUT Hub", s: "EXISTANTE" },
          { f: "Réinitialisation du mot de passe", d: "Routes auth dédiées", s: "EXISTANTE" },
          { f: "Basculement de rôle Locataire ↔ Propriétaire", d: "/api/user/switch-role + canSwitchRole (onboarding-modal)", s: "EXISTANTE" },
        ],
      },
    ],
  },
  {
    title: "Locataire",
    mission: "Rechercher un bien, se qualifier via un dossier validé par le Tiers de confiance, visiter, signer, payer, habiter puis sortir. Seul acteur disposant du parcours complet dossier → candidature → bail ; dossier unique en v1.",
    screens: "25 sections dédiées (sidebar 12 items)",
    categories: [
      {
        title: "Recherche et présélection",
        items: [
          { f: "Recherche de biens avec filtres, tri et carte", d: "Catalogue public + Leaflet", s: "EXISTANTE" },
          { f: "Gestion des favoris", d: "favorites.tsx, /api/favorites, table favorites", s: "EXISTANTE" },
          { f: "Recherches sauvegardées et alertes personnalisées", d: "/api/search-alerts — déclenchement automatique des notifications à confirmer", s: "PARTIELLE" },
          { f: "Détail d'un bien et demande de visite", d: "Modal de détail + /api/visits", s: "EXISTANTE" },
        ],
      },
      {
        title: "Dossier locatif et candidature",
        items: [
          { f: "Création du dossier locatif (documents justificatifs)", d: "rental_files + documents + /api/rental-file", s: "EXISTANTE" },
          { f: "Dépôt et suivi de candidature", d: "/api/applications — statut de candidature partagé avec celui du dossier, à séparer", s: "PARTIELLE" },
          { f: "KYC / vérification d'identité (ONECI + NeoFace)", d: "Champs neoface_verified / oneci_verified + historiques", s: "EXISTANTE" },
          { f: "Retrait d'une candidature ou d'un dossier", d: "Route /api/rental-file/withdraw présente mais non branchée dans l'UI", s: "MANQUANTE" },
          { f: "Partage du profil locataire", d: "Route /api/profile/share sans accès depuis le dashboard", s: "MANQUANTE" },
          { f: "Dossiers multiples (configurations familiales, garant)", d: "Non prévu en v1 — dossier unique", s: "MANQUANTE" },
        ],
      },
      {
        title: "Visites",
        items: [
          { f: "Demande et suivi des visites (tous les statuts)", d: "my-visits.tsx, visit_requests", s: "EXISTANTE" },
          { f: "Contre-proposition et annulation de visite", d: "Statuts modélisés de bout en bout", s: "EXISTANTE" },
          { f: "Rappels automatiques J-1 / J-3", d: "Edge Function remind-upcoming-visits — scheduler pg_cron non configuré", s: "PARTIELLE" },
        ],
      },
      {
        title: "Baux et signature",
        items: [
          { f: "Consultation des locations et détail du bail", d: "my-leases.tsx, lease-detail.tsx", s: "EXISTANTE" },
          { f: "Signature électronique du bail (dessin + OTP interne)", d: "signature-pad.tsx + /api/signature", s: "EXISTANTE" },
          { f: "Signature qualifiée via CRYPTONEO / ANSUT", d: "Edge Functions signature (alias, OTP, certificat, PDF)", s: "EXISTANTE" },
          { f: "Relance automatique des signatures en attente", d: "Edge Function remind-pending-lease-signatures — planification à câbler", s: "PARTIELLE" },
          { f: "Renouvellement du bail à l'échéance", d: "/api/renewals — notification d'échéance et avenant signé à confirmer", s: "PARTIELLE" },
        ],
      },
      {
        title: "Paiements",
        items: [
          { f: "Paiement du loyer en mobile money (Orange Money, MTN MoMo, Moov, Wave)", d: "/api/payments + Intouch (cashin)", s: "EXISTANTE" },
          { f: "Paiement immédiat et paiement anticipé", d: "payments/paiement-immediat, payments/advance + callback Intouch", s: "EXISTANTE" },
          { f: "Paiement partiel avec suivi du solde restant", d: "Statut PARTIAL modélisé — solde et historique de tentatives non représentés", s: "PARTIELLE" },
          { f: "Historique et détail des paiements", d: "payments.tsx, payment-detail.tsx", s: "EXISTANTE" },
          { f: "Quittance de loyer et reçu de caution", d: "Aucun modèle ni flux identifiable dans le dépôt", s: "MANQUANTE" },
        ],
      },
      {
        title: "Vie locative",
        items: [
          { f: "États des lieux d'entrée / sortie (accès locataire, signature bilatérale)", d: "Modèle inventory_reports présent — parcours locataire non exposé", s: "PARTIELLE" },
          { f: "Demandes de maintenance et suivi", d: "maintenance.tsx, maintenance_requests + commentaires", s: "EXISTANTE" },
          { f: "Ouverture et suivi de litiges", d: "my-disputes.tsx, /api/disputes", s: "EXISTANTE" },
          { f: "Avis et notation croisée sur bail terminé", d: "reviews.tsx — invitation automatique à la clôture à confirmer", s: "PARTIELLE" },
          { f: "Messagerie temps réel avec les parties liées", d: "messages.tsx + hooks Realtime", s: "EXISTANTE" },
          { f: "Trust-score et notifications personnalisées", d: "trust-score + notification_preferences", s: "EXISTANTE" },
        ],
      },
      {
        title: "Paramètres du compte",
        items: [
          { f: "Profil, téléphone, email, mot de passe", d: "settings + /api/user, /api/profile", s: "EXISTANTE" },
          { f: "Sécurité du compte et sessions actives", d: "Sessions httpOnly, OTP hashés", s: "EXISTANTE" },
          { f: "Suppression du compte", d: "Route dédiée /api/user", s: "EXISTANTE" },
        ],
      },
    ],
  },
  {
    title: "Propriétaire",
    mission: "Publier et exploiter ses biens, sélectionner les candidats, contractualiser, encaisser les loyers, déléguer à une agence par mandat et suivre l'entretien jusqu'à la fin des locations.",
    screens: "21 sections dédiées (+ finances, analytics, dossier, avis, trust-score en navigation interne)",
    categories: [
      {
        title: "Pilotage",
        items: [
          { f: "Tableau de bord (KPIs et synthèse de portefeuille)", d: "/api/dashboard/proprietaire", s: "EXISTANTE" },
          { f: "Finances (encaissements des loyers de ses biens)", d: "finances.tsx — statut PARTIAL géré côté API mais absent de l'UI", s: "PARTIELLE" },
          { f: "Analytics du portefeuille", d: "analytics.tsx — calcul réel des agrégats à confirmer en production", s: "ACONFIRMER" },
          { f: "Historique financier audité", d: "Non présent (recommandation P2 de l'audit)", s: "MANQUANTE" },
        ],
      },
      {
        title: "Gestion des biens",
        items: [
          { f: "Publication et édition de biens (médias, caractéristiques, statut)", d: "my-properties.tsx, add-property.tsx, /api/properties", s: "EXISTANTE" },
          { f: "Gestion des titres fonciers", d: "ownership_documents — non rattachés au bien (property_id absent)", s: "PARTIELLE" },
          { f: "Dossier propriétaire (pièces distinctes des titres par bien)", d: "owner-file.tsx, owner_files — à relier au parcours TC", s: "EXISTANTE" },
          { f: "Expiration automatique des annonces obsolètes", d: "Edge Function expire-stale-listings — cron non configuré", s: "PARTIELLE" },
          { f: "Synchronisation du statut bien / bail (disponible → loué)", d: "Transitions dispersées dans plusieurs routes — à centraliser en trigger idempotent", s: "PARTIELLE" },
        ],
      },
      {
        title: "Candidatures et locataires",
        items: [
          { f: "Consultation et traitement des candidatures (accepter / refuser)", d: "enhanced-rental-files.tsx, /api/applications", s: "EXISTANTE" },
          { f: "Gestion des locataires (liste, détail)", d: "my-tenants.tsx, tenant-detail.tsx", s: "EXISTANTE" },
          { f: "Visibilité du statut de validation TC des dossiers", d: "Lecture du statut de dossier", s: "EXISTANTE" },
        ],
      },
      {
        title: "Visites",
        items: [
          { f: "Traitement des demandes de visite (accepter, refuser, contre-proposer)", d: "visit-requests.tsx, /api/visits", s: "EXISTANTE" },
          { f: "Rappels de visite aux participants", d: "Edge Function remind-upcoming-visits — planification à câbler", s: "PARTIELLE" },
        ],
      },
      {
        title: "Baux et contrats",
        items: [
          { f: "Création et génération des baux", d: "enhanced-leases.tsx, /api/leases", s: "EXISTANTE" },
          { f: "Signature OTP / CRYPTONEO", d: "Edge Functions signature", s: "EXISTANTE" },
          { f: "Résiliation de bail", d: "Route terminate dédiée", s: "EXISTANTE" },
          { f: "Renouvellement de bail", d: "renewals.tsx — notifications d'échéance et avenant signé à confirmer", s: "PARTIELLE" },
          { f: "Gestion de la caution (dépôt, restitution, justificatif)", d: "Aucun flux complet identifiable — risque de litige", s: "MANQUANTE" },
          { f: "Génération automatique des échéances mensuelles", d: "Edge Function generate-monthly-payments — cron non configuré", s: "PARTIELLE" },
        ],
      },
      {
        title: "Mandats et délégation agence",
        items: [
          { f: "Création de mandats d'administration", d: "mandats.tsx, /api/mandats", s: "EXISTANTE" },
          { f: "Signature de mandat (propre + contre-signature agence)", d: "Schéma de la route de signature divergent de la migration mandats", s: "PARTIELLE" },
          { f: "Contrôle d'accès du portefeuille délégué", d: "agency_agent_properties sans garantie de mandat actif ni de propriétaire correspondant", s: "PARTIELLE" },
        ],
      },
      {
        title: "Maintenance, impayés et avis",
        items: [
          { f: "Suivi des demandes de maintenance", d: "owner-maintenance.tsx + assignation", s: "EXISTANTE" },
          { f: "Traitement proactif des impayés", d: "check-overdue-payments : Edge Function ET route concurrentes — risque de double traitement", s: "PARTIELLE" },
          { f: "Consultation des paiements de ses biens", d: "finances.tsx + /api/owner", s: "EXISTANTE" },
          { f: "Invitation automatique à noter à la clôture du bail", d: "Non démontrée dans le code", s: "MANQUANTE" },
          { f: "Réponses aux avis reçus", d: "/api/reviews/[id]/reply", s: "EXISTANTE" },
        ],
      },
      {
        title: "Compte",
        items: [
          { f: "Profil, sécurité et préférences", d: "owner-settings.tsx, security.tsx", s: "EXISTANTE" },
          { f: "Trust-score propriétaire", d: "Écran dédié en navigation interne", s: "EXISTANTE" },
        ],
      },
    ],
  },
  {
    title: "Agence",
    mission: "Gérer un portefeuille de biens pour le compte de propriétaires sous mandat, coordonner des agents de terrain, traiter dossiers et visites, contractualiser et suivre ses revenus (commissions).",
    screens: "14 sections dédiées",
    categories: [
      {
        title: "Pilotage",
        items: [
          { f: "Tableau de bord pipeline (portefeuille agrégé)", d: "overview.tsx, /api/dashboard/agence", s: "EXISTANTE" },
          { f: "Finances et commissions", d: "Table commissions présente — événement de création et rapprochement bail/paiement non démontrés", s: "PARTIELLE" },
          { f: "Analytics agence", d: "analytics.tsx — qualité des agrégats à confirmer", s: "ACONFIRMER" },
        ],
      },
      {
        title: "Portefeuille et mandats",
        items: [
          { f: "Portefeuille de biens sous mandat", d: "portfolio.tsx — contrôle du mandat actif côté serveur à durcir", s: "PARTIELLE" },
          { f: "Création de mandats", d: "/api/mandats", s: "EXISTANTE" },
          { f: "Contre-signature de mandat", d: "Schéma de signature à aligner avec la migration (P0)", s: "PARTIELLE" },
          { f: "Exports des contrats et analytics", d: "Boutons présents — déclenchent un toast « à venir »", s: "MANQUANTE" },
        ],
      },
      {
        title: "Opérations locatives",
        items: [
          { f: "Traitement des candidatures", d: "candidatures.tsx — statuts de candidature/dossier à clarifier", s: "PARTIELLE" },
          { f: "Dossiers clients", d: "client-files.tsx", s: "EXISTANTE" },
          { f: "Gestion des visites (agent assigné, contre-proposition)", d: "visits.tsx, visit_requests", s: "EXISTANTE" },
          { f: "Rappels de visite", d: "Bouton affiché — aucun appel API d'envoi identifié", s: "MANQUANTE" },
          { f: "Gestion des contrats délégués", d: "contracts.tsx — responsabilité de signature à expliciter", s: "PARTIELLE" },
        ],
      },
      {
        title: "Équipe et communication",
        items: [
          { f: "Gestion de l'équipe d'agents", d: "team.tsx — agency_agents sans user_id : agents non connectables (P1)", s: "PARTIELLE" },
          { f: "Communication (messages, notifications)", d: "communication.tsx", s: "EXISTANTE" },
          { f: "Marketing et promotion des biens", d: "marketing.tsx — sans pipeline de campagne ni métriques mesurables", s: "PARTIELLE" },
          { f: "Validation de l'agence par le Tiers de confiance", d: "Certification AGENCY sans cible agency_id dédiée (P0)", s: "PARTIELLE" },
          { f: "Paramètres et sécurité du compte", d: "settings.tsx, security.tsx", s: "EXISTANTE" },
        ],
      },
    ],
  },
  {
    title: "Tiers de confiance (TC)",
    mission: "Contrôler biens, dossiers et identités, émettre des certifications, affecter des missions terrain, réaliser les états des lieux, suivre les SLA et traiter fraude et litiges. Acteur au périmètre le plus riche (28 sections).",
    screens: "28 sections dédiées",
    categories: [
      {
        title: "Files de validation et SLA",
        items: [
          { f: "Tableau de bord des files de validation (KPIs)", d: "overview.tsx, rental-files-queue.tsx, validation_slas", s: "EXISTANTE" },
          { f: "Suivi des SLA de validation", d: "sla-monitoring.tsx — relation polymorphe sans clé étrangère forte", s: "PARTIELLE" },
          { f: "Centre de documentation", d: "documentation.tsx — contenu statique, non administrable ni versionné", s: "PARTIELLE" },
        ],
      },
      {
        title: "Validations de dossiers et biens",
        items: [
          { f: "Validation des dossiers locataires (documents, décision)", d: "dossier-validations.tsx, rental-file-detail.tsx", s: "EXISTANTE" },
          { f: "Validation des dossiers propriétaires", d: "owner-validations.tsx, owner-dossier-validations.tsx", s: "EXISTANTE" },
          { f: "Validation des agences (agrément)", d: "agency-validations.tsx — pas de dossier agence dédié, cible ambiguë (P0)", s: "PARTIELLE" },
          { f: "Vérification des biens (statut PENDING_VERIFICATION)", d: "property-verifications.tsx, property-verify-detail.tsx", s: "EXISTANTE" },
          { f: "Gestion de la durée de validité des dossiers", d: "Champs de validité présents — expiration opérationnelle à confirmer", s: "PARTIELLE" },
          { f: "Workflow de demande de complément", d: "Commentaires présents — workflow, notification et reprise non homogènes", s: "PARTIELLE" },
        ],
      },
      {
        title: "Vérification d'identité (KYC)",
        items: [
          { f: "Vérification ONECI (match NNI, visage, empreinte RNPP Connect)", d: "oneci-verification.tsx + Edge Functions oneci-*", s: "EXISTANTE" },
          { f: "Reconnaissance faciale NeoFace", d: "kyc-face-auth + table facial_verifications", s: "EXISTANTE" },
          { f: "Historisation uniforme des résultats KYC", d: "ONECI (indicateur users) vs NeoFace (historique complet) — niveaux divergents", s: "PARTIELLE" },
        ],
      },
      {
        title: "Terrain et missions",
        items: [
          { f: "Gestion des agents de terrain", d: "agents.tsx — fiches verification_agents sans compte utilisateur lié (P0)", s: "PARTIELLE" },
          { f: "Création et affectation de missions", d: "missions.tsx, /api/tc/missions", s: "EXISTANTE" },
          { f: "Notification des missions à l'agent terrain", d: "La notification part vers le TC et non vers l'agent (P0)", s: "MANQUANTE" },
          { f: "Exécution de mission par un agent connecté", d: "Aucun parcours d'authentification agent — mission non exécutable par un acteur distinct", s: "MANQUANTE" },
        ],
      },
      {
        title: "États des lieux",
        items: [
          { f: "Formulaire de rapport d'état des lieux (entrée / sortie)", d: "inventory-report-form.tsx, inventory_report_items", s: "EXISTANTE" },
          { f: "Liste et suivi des rapports", d: "inventory-reports-list.tsx + Realtime", s: "EXISTANTE" },
        ],
      },
      {
        title: "Certifications et sécurité",
        items: [
          { f: "Octroi, révocation et expiration de certifications", d: "certifications.tsx, /api/certificates", s: "EXISTANTE" },
          { f: "Détection et traitement des alertes fraude", d: "fraud-alerts.tsx, fraud_alerts", s: "EXISTANTE" },
          { f: "Médiation des litiges", d: "litiges.tsx, /api/disputes", s: "EXISTANTE" },
          { f: "Consultation des utilisateurs de la plateforme", d: "Écran Utilisateurs TC", s: "EXISTANTE" },
        ],
      },
      {
        title: "Support et compte",
        items: [
          { f: "Messagerie", d: "messaging.tsx", s: "EXISTANTE" },
          { f: "Notifications et préférences", d: "notifications + préférences", s: "EXISTANTE" },
          { f: "Paramètres du compte", d: "Paramètres TC", s: "EXISTANTE" },
        ],
      },
    ],
  },
  {
    title: "Administrateur",
    mission: "Superviser globalement la plateforme : comptes, modération du contenu et des avis, gestion des Tiers de confiance, signalements, litiges, sécurité, rapports, configuration et sauvegardes.",
    screens: "15 sections dédiées",
    categories: [
      {
        title: "Supervision et comptes",
        items: [
          { f: "Vue globale de supervision", d: "overview.tsx, /api/dashboard/admin — agrégats à confirmer", s: "ACONFIRMER" },
          { f: "Gestion des utilisateurs", d: "admin/users.tsx, /api/admin/users", s: "EXISTANTE" },
          { f: "Gestion des Tiers de confiance (supervision)", d: "tc-management.tsx, trust-agents.tsx", s: "EXISTANTE" },
          { f: "Création / révocation opérationnelle des TC", d: "Certaines actions affichent un toast sans appel API (P1)", s: "PARTIELLE" },
          { f: "Cycle de vie unique des TC (activation, révocation, audit)", d: "Statuts multiples selon les écrans — à unifier", s: "PARTIELLE" },
        ],
      },
      {
        title: "Modération et signalements",
        items: [
          { f: "Modération des biens (validation, rejet, retrait)", d: "properties-moderation.tsx, /api/admin/properties-moderation", s: "EXISTANTE" },
          { f: "Modération des avis", d: "Aucun écran ni route dédiés aux ratings (P1)", s: "MANQUANTE" },
          { f: "Consultation du contenu signalé", d: "Bouton « Voir le contenu » sans détail exploitable", s: "PARTIELLE" },
          { f: "Traitement des signalements", d: "signalements.tsx, /api/admin/signalements", s: "EXISTANTE" },
          { f: "Supervision des litiges", d: "disputes.tsx", s: "EXISTANTE" },
        ],
      },
      {
        title: "Notifications",
        items: [
          { f: "Gestion et diffusion des notifications", d: "admin/notifications.tsx — diffusion à vérifier", s: "ACONFIRMER" },
        ],
      },
      {
        title: "Système, sécurité et configuration",
        items: [
          { f: "Sécurité : audit logs, logs de connexion, sessions", d: "security.tsx — couverture de toutes les actions sensibles à compléter", s: "PARTIELLE" },
          { f: "Rapports plateforme (statistiques réelles)", d: "reports.tsx — valeurs codées en dur, export simulé (P0)", s: "MANQUANTE" },
          { f: "Export structuré (CSV / Excel)", d: "Aucun endpoint dédié (P1)", s: "MANQUANTE" },
          { f: "Configuration persistée de la plateforme", d: "settings.tsx via /api/admin/settings + platform_settings", s: "EXISTANTE" },
          { f: "Configuration avancée (écran config)", d: "Doublon de settings non persisté — à fusionner (P0)", s: "PARTIELLE" },
          { f: "Sauvegardes", d: "Contrat UI/API divergent (noms de champs et statuts différents) (P0)", s: "PARTIELLE" },
          { f: "Contrôle des tâches système (crons, jobs de paiement)", d: "Points d'entrée multiples — autorisation et exécution unique à centraliser (P0)", s: "PARTIELLE" },
        ],
      },
    ],
  },
];

const TRANSVERSE = [
  { f: "Authentification Supabase + sessions httpOnly + OTP hashés", d: "SHA-256 + pepper OTP_HASH_PEPPER", s: "EXISTANTE" },
  { f: "Garde de rôles par middleware (ROLE_ROUTES)", d: "middleware.ts — escalade ADMIN via API register à durcir", s: "PARTIELLE" },
  { f: "Messagerie temps réel (Supabase Realtime)", d: "25 hooks use-realtime-*.ts", s: "EXISTANTE" },
  { f: "Notifications multi-canaux (SMS / email ANSUT Hub)", d: "notification_preferences + OTP", s: "EXISTANTE" },
  { f: "Encaissement mobile money Intouch (cashin, immédiat, anticipé, transferts)", d: "Webhook vérifié par HMAC — plafond de transfert optionnel (MAX_TRANSFER_AMOUNT_XOF)", s: "EXISTANTE" },
  { f: "Signature électronique (CRYPTONEO / ANSUT + OTP interne)", d: "8 Edge Functions signature", s: "EXISTANTE" },
  { f: "KYC ONECI / NeoFace (NNI, visage, empreinte)", d: "7 Edge Functions KYC", s: "EXISTANTE" },
  { f: "Assistant conversationnel SUTA (Azure OpenAI)", d: "/api/suta — appel côté serveur uniquement", s: "EXISTANTE" },
  { f: "Application mobile Capacitor (iOS / Android)", d: "capacitor.config.ts, cap:sync / cap:build:apk", s: "EXISTANTE" },
  { f: "Scheduler des tâches planifiées (pg_cron)", d: "6 Edge Functions planifiées (rappels, expirations, paiements) — aucune cron définie (dette documentée)", s: "MANQUANTE" },
  { f: "Typage Supabase complet (types.ts)", d: "Tables et relations manquantes — assertions faibles dans les routes", s: "PARTIELLE" },
  { f: "Tests automatisés (Vitest + Playwright)", d: "10 specs unitaires (src/test), 2 specs e2e (auth-flow, roles)", s: "EXISTANTE" },
];

const PRIORITIES = [
  { p: "P0", constat: "Sécurité des accès", detail: "Escalade ADMIN via /api/auth/register ; fallback de session sans vérification cryptographique (146 routes) ; webhook Intouch fail-open.", acteurs: "Tous", action: "Whitelist serveur des rôles, vérification cryptographique des sessions, secret HMAC obligatoire du webhook." },
  { p: "P0", constat: "Mandats et délégation", detail: "Contrat de signature des mandats divergent (route vs migration) ; portefeuille agence sans garantie de mandat actif.", acteurs: "Propriétaire, Agence", action: "Aligner schéma / route / types ; conditionner l'accès au portefeuille au mandat actif." },
  { p: "P0", constat: "Modèle d'agents terrain (TC)", detail: "Agents sans compte utilisateur ; missions notifiées au TC et non à l'agent ; exécution impossible par un acteur distinct.", acteurs: "Tiers de confiance", action: "Décider le modèle opérationnel (compte connecté ou ressource interne) et router les notifications vers l'agent." },
  { p: "P0", constat: "Finance locative", detail: "Paiement PARTIAL sans solde modélisé ; callbacks de paiement non idempotents ; double traitement des impayés (route + Edge Function).", acteurs: "Locataire, Propriétaire", action: "Modéliser le solde, rendre les callbacks idempotents, centraliser l'exécution planifiée." },
  { p: "P0", constat: "Fiabilité du back-office", detail: "Rapports admin en données fictives ; double écran de configuration ; contrat sauvegardes divergent entre UI et API.", acteurs: "Admin", action: "Reporting serveur avec pagination, écran de configuration unique, DTO partagé et tests des états." },
  { p: "P1", constat: "Sortie de location", detail: "Quittance, restitution de caution et états des lieux côté locataire sans parcours complet.", acteurs: "Locataire, Propriétaire, TC", action: "Créer un parcours complet entrée / sortie avec signature bilatérale et archives." },
  { p: "P1", constat: "Commissions de bout en bout", detail: "Table commissions sans événement de création ni rapprochement avec bail et paiements.", acteurs: "Agence", action: "Définir un événement idempotent à la contractualisation / paiement." },
  { p: "P1", constat: "Validations et KYC", detail: "Expiration opérationnelle des dossiers à confirmer ; historisation ONECI / NeoFace hétérogène ; cible de certification agence ambiguë.", acteurs: "Tiers de confiance", action: "Centraliser statuts, preuves et validité ; historiser uniformément les vérifications." },
  { p: "P1", constat: "Automatisation des rappels", detail: "6 Edge Functions planifiées (visites, paiements, signatures, expirations) sans scheduler configuré.", acteurs: "Tous", action: "Configurer pg_cron (ou orchestrateur externe) + CRON_SECRET." },
  { p: "P1", constat: "Exports et modération des avis", detail: "Exports agence / admin simulés (toast) ; aucune file de modération des ratings.", acteurs: "Agence, Admin", action: "Endpoints d'export contrôlés ; relier ratings, signalements et décisions admin." },
  { p: "P2", constat: "Expérience locataire avancée", detail: "Routes de retrait de dossier et de partage de profil non branchées ; dossiers multiples non prévus.", acteurs: "Locataire", action: "Brancher les routes existantes à l'UI ; planifier les dossiers versionnés." },
  { p: "P2", constat: "Marketing et documentation", detail: "Section marketing sans métriques ; centre de documentation statique ; historique financier absent.", acteurs: "Agence, TC, Propriétaire", action: "Relier le marketing à des métriques vérifiables ; versionner la documentation ; auditer les finances." },
];

module.exports = { ACTORS, TRANSVERSE, PRIORITIES };
