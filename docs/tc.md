Objectif : Valider tous les acteurs et dossiers pour garantir la confiance sur la plateforme.
SLA : 48h affiché aux utilisateurs.
Back-office dédié (rôle RLS Supabase spécifique).
🖥️ Back-office & File d'attente (Sprint 4)
ID
User Story
Priorité
Commentaire
MON-028
ETQTDC, je dispose d'un back-office dédié pour gérer toutes mes missions de validation
Haute
Interface séparée – rôle RLS dédié Supabase
MON-029
ETQTDC, je peux consulter la file d'attente des dossiers à valider avec indicateur de délai (SLA 48h affiché aux utilisateurs)
Haute
'Votre dossier sera traité sous 48h'
📋 Validations (Sprint 4)
ID
User Story
Priorité
Commentaire
MON-030
ETQTDC, je peux valider ou rejeter un dossier locataire (pièces justificatives, revenus, garant) avec commentaire obligatoire
Haute
—
MON-031
ETQTDC, je peux définir la durée de validité d'un dossier locataire validé (ex : 3 ou 6 mois) – passé ce délai le candidat est notifié pour resoumission
Haute
Évite les dossiers validés périmés
MON-032
ETQTDC, je peux valider les profils propriétaires (identité + documents de propriété du bien / titre foncier)
Haute
La validation du titre foncier bloque la fraude en amont
MON-033
ETQTDC, je peux valider les dossiers des agences (RCCM, agrément professionnel, identité du gérant)
Haute
—
MON-034
ETQTDC, je peux demander des documents complémentaires avant de statuer (message + notification auto à l'utilisateur)
Haute
—
🔔 Notifications (Sprint 4)
ID
User Story
Priorité
Commentaire
MON-035
ETQU, je suis notifié (push + email) du résultat de la validation et de la durée de validité accordée
Haute
—
🔮 V2 – Vérifications biométriques & institutionnelles
ID
User Story
Priorité
Commentaire
MON-113
ETQC, le tiers de confiance peut vérifier mon identité via Smile ID (biométrie + CNI)
Haute
🔴 Bloqué : intégration API Smile ID
MON-114
ETQC, le tiers de confiance peut vérifier mon dossier via l'API CCI Abidjan si je suis une entreprise
Haute
🔴 Bloqué : accord institutionnel CCI requis