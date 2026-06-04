Objectif : Permettre au candidat de constituer un dossier validé par le Tiers de Confiance, de visiter des biens, de signer un bail et de devenir locataire.
Parcours : Inscription → Onboarding → Profil → Dossier TC → Recherche → Visite → Dossier envoyé → Contrat → Locataire.
🔐 Inscription & Connexion (Sprint 2)
ID
User Story
Priorité
Commentaire
MON-013
ETQT, je peux m'inscrire avec email + mot de passe (Supabase Auth)
Haute
—
MON-014
ETQT, je peux me connecter avec mon email et mot de passe
Haute
—
MON-015
ETQT, je peux m'inscrire et me connecter via numéro de téléphone + OTP SMS
Haute
Prioritaire pour le marché ivoirien – natif Supabase Auth
MON-016
ETQT, je peux réinitialiser mon mot de passe via lien email
Haute
—
MON-017
ETQT, lors de l'inscription je choisis mon rôle : Candidat locataire, Propriétaire ou Agence
Haute
—
MON-018
ETQT, je dois accepter les CGU et la Politique de confidentialité avant de valider mon inscription (consentement horodaté en base)
Haute
Obligation légale
MON-019
ETQT, après inscription, un écran d'onboarding me guide selon mon rôle : 'Complétez votre profil → Uploadez vos documents → Soumettez au TC'
Haute
Réduit fortement le taux d'abandon
MON-020
ETQT, je peux modifier mon email, mon mot de passe et supprimer définitivement mon compte
Haute
Droit à l'effacement – RGPD
MON-021
ETQT, je peux avoir les deux rôles Propriétaire et Candidat locataire sur un même compte et basculer entre eux
Haute
Cas très fréquent sur le marché ivoirien
👤 Profil & Documents KYC (Sprint 3)
ID
User Story
Priorité
Commentaire
MON-022
ETQC, je peux créer et éditer mon profil locataire (nom, photo, contacts)
Haute
—
MON-026
ETQT, je peux uploader mes documents KYC (CNI recto/verso, justificatif de domicile) dans Supabase Storage avec accès restreint RLS
Haute
Soumis à validation TC
🔍 Recherche de biens avancée (Sprint 6)
ID
User Story
Priorité
Commentaire
MON-053
ETQC, je peux voir la fiche détaillée complète d'un bien (toutes les caractéristiques, photos HD, carte précise, badge 'Vérifié TC')
Haute
Détails complets réservés aux connectés
MON-055
ETQC, je peux sauvegarder des biens en favoris
Moyenne
—
MON-056
ETQC, je peux créer une alerte de recherche pour être notifié quand un nouveau bien correspond à mes critères
Haute
Standard – forte valeur UX
📁 Dossier locatif (Sprint 7)
ID
User Story
Priorité
Commentaire
MON-057
ETQC, je peux créer mon dossier locatif (revenus, employeur, garant, documents justificatifs) stocké dans Supabase Storage
Haute
—
MON-058
ETQC, je peux soumettre mon dossier au tiers de confiance pour validation
Haute
Le dossier n'est visible par le propriétaire qu'après validation TC
MON-059
ETQC, je peux envoyer mon dossier validé TC à un propriétaire / agence depuis la fiche d'un bien
Haute
—
MON-036
ETQU, si mon dossier est rejeté, je peux corriger mes documents et le soumettre à nouveau
Haute
—
🚪 Visites (Sprint 7)
ID
User Story
Priorité
Commentaire
MON-062
ETQC, je peux demander une visite depuis la fiche d'un bien (date + créneau souhaité)
Haute
—
MON-064
ETQU, je reçois une notification de confirmation ou de modification de ma visite
Haute
—
MON-065
ETQU, je reçois un rappel automatique J-1 avant ma visite (push + email)
Haute
Réduit fortement les no-shows
MON-066
ETQU, je peux annuler une visite confirmée – l'autre partie est notifiée immédiatement
Haute
—
💬 Messagerie & Support (Sprint 8)
ID
User Story
Priorité
Commentaire
MON-067
ETQU, je peux envoyer et recevoir des messages texte (Supabase Realtime)
Haute
—
MON-068
ETQU, je peux consulter l'historique complet de mes conversations
Haute
—
MON-069
ETQU, je reçois une notification push et email à chaque nouveau message
Haute
—
MON-071
ETQU, je peux contacter l'équipe MON TOIT via un formulaire de contact ou email support accessible depuis toutes les pages
Haute
—
📝 Contractualisation (Sprint 9)
ID
User Story
Priorité
Commentaire
MON-072
ETQU, après acceptation du dossier, je peux générer un contrat de bail pré-rempli incluant le montant de la caution (dépôt de garantie)
Haute
Template PDF configurable – déclenché par MON-061
MON-073
ETQU, je peux signer le contrat de bail électroniquement (validation par OTP SMS)
Haute
—
MON-074
ETQU, si l'une des parties n'a pas signé sous 48h, une relance automatique lui est envoyée (push + email)
Haute
Évite les contrats bloqués indéfiniment
MON-075
ETQU, je peux télécharger le contrat signé en PDF
Haute
—
MON-076
ETQU, je peux réaliser un état des lieux d'entrée numérique (photos + commentaires pièce par pièce) signé par OTP
Haute
Critique pour éviter les litiges en fin de bail
MON-077
ETQU, mes anciens contrats, états des lieux et documents signés sont accessibles dans un espace 'Archives'
Haute
Archivage baux expirés – besoin légal et pratique
🔚 Clôture & Notation (Sprint 10)
ID
User Story
Priorité
Commentaire
MON-078
ETQU, je peux initier la clôture formelle d'un bail (fin de contrat ou résiliation anticipée)
Haute
Déclencheur de la notation et de la réouverture du bien
MON-079
À la clôture d'un bail, les deux parties reçoivent automatiquement une invitation à noter l'autre partie (push + email)
Haute
Sans ce déclencheur, les notations ne seront jamais remplies
MON-080
ETQL, à la clôture du bail je peux noter et laisser un avis sur le propriétaire / l'agence
Haute
Mécanisme de confiance central
🔮 V2 – Fonctionnalités avancées (Locataire ETQL)
ID
User Story
Priorité
Commentaire
MON-095
ETQL, je peux payer mon loyer en ligne via mobile money (Orange Money, MTN MoMo, Wave)
Haute
Dépend API Intouch
MON-096
ETQL, je paie X mois de loyer en avance selon les exigences du propriétaire
Haute
—
MON-097
ETQL, je reçois un rappel automatique J-3 avant la date d'échéance de mon loyer
Haute
—
MON-099
ETQL, je peux payer en cash et recevoir un reçu digital du propriétaire
Moyenne
—
MON-100
ETQL, je reçois automatiquement une quittance de loyer PDF après chaque paiement
Haute
Obligation légale – très attendu
MON-101
ETQL, je reçois un reçu de dépôt de garantie (caution) lors du versement initial
Haute
Distinct du contrat de bail
MON-102
ETQL, je peux consulter l'historique complet de mes paiements
Haute
—
MON-110
ETQU, je peux tracer la restitution de la caution en fin de bail avec justificatif
Haute
Très important : souvent 2-3 mois de loyer
MON-111
ETQU, je peux renouveler un bail (notification automatique 2 mois avant échéance + avenant signé par OTP)
Haute
—
MON-112
ETQU, je peux réaliser un état des lieux de sortie numérique signé par OTP
Haute
—
MON-113
ETQC, le tiers de confiance peut vérifier mon identité via Smile ID (biométrie + CNI)
Haute
🔴 Bloqué : intégration API Smile ID
MON-117
ETQL, je peux créer un ticket de maintenance et suivre son statut (ouvert / en cours / résolu)
Haute
—
MON-120
ETQC, je peux créer plusieurs versions de mon dossier (solo, en couple, avec garant) et choisir lequel envoyer selon le bien
Moyenne
Multi-dossier – cas fréquent
MON-121
ETQU, je peux envoyer des photos et documents par message (limite 10 Mo/fichier)
Moyenne
—
MON-123
La fiche de bien suggère des biens similaires (moteur de recommandation par critères)
Moyenne
—
MON-124
ETQT, je vois un indicateur de complétude de mon profil (ex : '70% complété') avec les étapes manquantes
Moyenne
Améliore la conversion
MON-125
Mise en place de la connexion et inscription par SSO Google
Moyenne
—
MON-126
Mise en place de la connexion et inscription par SSO Meta (Facebook)
Faible
—