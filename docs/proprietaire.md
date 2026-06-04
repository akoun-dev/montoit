Objectif : Publier, gérer et louer ses biens en toute sécurité, avec validation TC de son identité et de ses titres fonciers.
Double rôle possible : un compte peut être à la fois Propriétaire et Candidat locataire (MON-021).
🔐 Inscription & Profil (Sprint 2 & 3)
ID
User Story
Priorité
Commentaire
MON-013 à MON-021
Mêmes stories que le Candidat locataire pour inscription, connexion, onboarding, double rôle
Haute
Parcours commun
MON-023
ETQP, je peux créer et éditer mon profil propriétaire (nom, photo, contacts, présentation)
Haute
—
MON-026
ETQT, je peux uploader mes documents KYC (CNI, justificatif de domicile)
Haute
—
🏘️ Gestion des biens (Sprint 5)
ID
User Story
Priorité
Commentaire
MON-038
ETQP, je peux publier une annonce avec les caractéristiques structurées : type, surface, loyer, charges, caution (nb mois), disponibilité, meublé/non meublé, étage, parking, gardiennage
Haute
Champs structurés obligatoires – alimentent les filtres
MON-039
ETQP, je peux localiser mon bien sur une carte Leaflet via adresse ou épingle manuelle
Haute
—
MON-040
ETQP, je peux uploader jusqu'à 10 photos pour illustrer mon bien (Supabase Storage)
Haute
—
MON-041
ETQP, je peux éditer ou mettre à jour une annonce existante
Haute
—
MON-042
ETQP, je peux suspendre ou supprimer une de mes annonces
Haute
—
MON-043
ETQP, je peux voir les statistiques de chaque annonce : nombre de vues, dossiers reçus, visites demandées
Haute
Permet d'ajuster le prix ou la description
MON-046
ETQP, je dispose d'un tableau de bord synthétique : biens en ligne, dossiers en attente, visites programmées, contrats actifs
Haute
Vue synthétique
⚙️ Automatismes back-end (Sprint 5)
ID
User Story
Priorité
Commentaire
MON-007
Expiration automatique des annonces inactives après X mois → statut 'Suspendue' + notification propriétaire
Moyenne
Évite les annonces fantômes
MON-044
À la signature d'un contrat de bail, le bien passe automatiquement au statut 'Loué' et disparaît des résultats (trigger Supabase)
Haute
—
MON-045
À la clôture ou résiliation d'un bail, le bien repasse automatiquement au statut 'Disponible' et réapparaît dans les résultats
Haute
Symétrique de MON-044 – indispensable pour la rotation
📁 Gestion des dossiers & visites (Sprint 7)
ID
User Story
Priorité
Commentaire
MON-060
ETQP, je peux consulter tous les dossiers soumis pour chacun de mes biens (dossiers validés TC uniquement)
Haute
—
MON-061
ETQP, je peux accepter ou refuser un dossier locatif avec motif optionnel – l'acceptation déclenche automatiquement l'invitation à générer le contrat de bail
Haute
Lien métier clé : acceptation dossier → initiation contrat
MON-063
ETQP, je peux accepter, refuser ou proposer un autre créneau de visite
Haute
—
📝 Contractualisation & Clôture (Sprint 9 & 10)
ID
User Story
Priorité
Commentaire
MON-072 à MON-077
Mêmes stories que le candidat pour génération contrat, signature OTP, état des lieux, archives
Haute
—
MON-078
ETQU, je peux initier la clôture formelle d'un bail
Haute
—
MON-081
ETQP, à la clôture du bail je peux noter et laisser un avis sur le locataire
Haute
—
MON-083
ETQP, je peux répondre publiquement à un avis laissé sur mon profil
Moyenne
—
🔮 V2 – Paiements & Abonnements
ID
User Story
Priorité
Commentaire
MON-098
ETQP, je reçois une alerte si un loyer n'est pas payé à la date d'échéance (impayé)
Haute
Crucial pour la gestion locative
MON-103
ETQP, je peux consulter les paiements reçus, filtrables par bien immobilier
Haute
—
MON-106
ETQP, je peux souscrire et payer un abonnement mensuel à la plateforme via mobile money
Haute
Modèle économique plateforme
MON-107
ETQP, je paie une commission de 3% d'un mois de loyer à la contractualisation
Haute
—
MON-108
ETQP, je peux consulter l'historique de mes transactions envers la plateforme
Haute
—
MON-118
ETQP, je peux consulter et traiter toutes les demandes de maintenance de mes biens
Haute
—