# User Stories - MonToit Platform

## Table des matières

- [Locataire (Tenant)](#locataire-tenant)
- [Propriétaire (Owner)](#propriétaire-owner)
- [Agence/Agent (Agency)](#agenceagent-agency)
- [Admin](#admin)
- [Modérateur](#modérateur)
- [Trust Agent (Vérificateur)](#trust-agent-vérificateur)

---

## Locataire (Tenant)

**En tant que** locataire
**Je veux** pouvoir rechercher et trouver des biens immobiliers à louer
**Afin de** trouver mon logement idéal en France

| ID   | User Story                                                         | Acceptance Criteria                                                                                 |
| ---- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| L-01 | Rechercher des biens par localisation (ville, code postal)         | - Champ de recherche fonctionnel<br>- Résultats filtrés par localisation<br>- Suggestions de villes |
| L-02 | Filtrer par type de logement (studio, T1, T2, maison)              | - Liste des types disponibles<br>- Filtres s'appliquent aux résultats                               |
| L-03 | Filtrer par budget (loyer mensuel max)                             | - Slider ou champ de saisie<br>- Résultats adaptés au budget                                        |
| L-04 | Voir les détails complets d'un bien (photos, équipements, adresse) | - Galerie photos<br>- Liste des équipements<br>- Plan si disponible                                 |
| L-05 | Enregistrer des biens dans mes favoris                             | - Bouton favori sur chaque bien<br>- Section "Mes favoris" accessible                               |
| L-06 | Prendre contact avec le propriétaire ou l'agence                   | - Formulaire de contact intégré<br>- Messagerie interne                                             |
| L-07 | Déposer une candidature spontanée                                  | - Formulaire de candidature<br>- Upload de documents requis                                         |
| L-08 | Recevoir des notifications pour les nouveaux biens correspondants  | - Notifications push/email<br>- Filtres de notification configurables                               |
| L-09 | Consulter l'historique de mes candidatures                         | - Liste des candidatures avec statut<br>- Détails de chaque dossier                                 |
| L-10 | Compléter mon profil avec vérification d'identité                  | - Formulaire de profil complet<br>- Upload de documents ONECI<br>- Statut de vérification visible   |
| L-11 | Signer mon bail en ligne                                           | - Contrat générable en PDF<br>- Signature électronique<br>- Sauvegarde du bail signé                |
| L-12 | Gérer mes paiements de loyer                                       | - Historique des paiements<br>- Notifications d'échéance<br>- Paiement en ligne si activé           |
| L-13 | Gérer mes demandes de maintenance                                  | - Créer une demande<br>- Suivi de l'avancement                                                      |
| L-14 | Consulter mes contrats en cours                                    | - Liste des baux actifs<br>- Téléchargement PDF                                                     |

---

## Propriétaire (Owner)

**En tant que** propriétaire
**Je veux** pouvoir gérer mes biens et mes locataires
**Afin de** simplifier la gestion locative et maximiser mon rendement

| ID   | User Story                                | Acceptance Criteria                                                              |
| ---- | ----------------------------------------- | -------------------------------------------------------------------------------- |
| P-01 | Créer et publier une annonce pour un bien | - Formulaire complet<br>- Upload de photos<br>- Validation avant publication     |
| P-02 | Modifier les informations de mon bien     | - Accès au formulaire d'édition<br>- Mises à jour en temps réel                  |
| P-03 | Gérer la disponibilité de mes biens       | - Statut (disponible/occupé/indisponible)<br>- Dates de disponibilité            |
| P-04 | Définir le loyer et les conditions        | - Champ de prix<br>- Conditions (charges incluses/exclues)<br>- Caution demandée |
| P-05 | Consulter les candidatures reçues         | - Liste des candidatures par bien<br>- Filtres par statut                        |
| P-06 | Voir les profils des candidats            | - Accès au profil complet<br>- Statut de vérification                            |
| P-07 | Accepter ou refuser une candidature       | - Boutons d'action<br>- Notification au candidat                                 |
| P-08 | Communiquer avec les candidats            | - Messagerie intégrée<br>- Historique des messages                               |
| P-09 | Gérer mes locataires en place             | - Liste des locataires<br>- Accès aux contrats                                   |
| P-10 | Générer des contrats de bail              | - Génération automatique PDF<br>- Signature électronique<br>- Archivage          |
| P-11 | Suivre les paiements de loyer             | - Historique des paiements<br>- Statuts (payé/en retard)<br>- Relance possible   |
| P-12 | Gérer les demandes de maintenance         | - Réception des demandes<br>- Assignation<br>- Suivi de résolution               |
| P-13 | Consulter les statistiques de mes biens   | - Taux d'occupation<br>- Revenus mensuels<br>- Délai moyen de location           |
| P-14 | Recevoir des alertes importantes          | - Nouvelle candidature<br>- Paiement en retard<br>- Maintenance urgente          |

---

## Agence/Agent (Agency)

**En tant qu'** agence immobilière
**Je veux** pouvoir gérer un portefeuille de biens et de clients
**Afin de** optimiser mon activité et offrir un service de qualité

| ID   | User Story                                   | Acceptance Criteria                                                        |
| ---- | -------------------------------------------- | -------------------------------------------------------------------------- |
| A-01 | Gérer plusieurs agents au sein de l'agence   | - Création de comptes agents<br>- Assignation de biens aux agents          |
| A-02 | Publier des annonces au nom de l'agence      | - Branding agence visible<br>- Logo et informations                        |
| A-03 | Gérer le portefeuille de biens de l'agence   | - Vue globale<br>- Filtres par agent                                       |
| A-04 | Suivre les statistiques de l'agence          | - Performance globale<br>- Performance par agent<br>- Rapports exportables |
| A-05 | Gérer les dossiers de candidature            | - Pipeline de candidatures<br>- Assignation aux agents                     |
| A-06 | Communiquer avec propriétaires et locataires | - Messagerie interne<br>- Historique par dossier                           |
| A-07 | Gérer les mandats de gestion                 | - Type de mandat<br>- Durée et conditions                                  |
| A-08 | Facturer les services                        | - Édition de factures<br>- Suivi des paiements                             |
| A-09 | Gérer la visibilité des annonces             | - Mise en avant payante<br>- Options de sponsoring                         |
| A-10 | Accéder à des outils d'analyse avancés       | - Tendances du marché<br>- Comparatifs de prix<br>- Rapports périodiques   |

---

## Admin

**En tant qu'** administrateur de la plateforme
**Je veux** pouvoir superviser et gérer l'ensemble du système
**Afin de** garantir le bon fonctionnement et la sécurité de la plateforme

| ID    | User Story                                   | Acceptance Criteria                                                                      |
| ----- | -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| AD-01 | Superviser les utilisateurs de la plateforme | - Liste des utilisateurs<br>- Filtres par rôle et statut                                 |
| AD-02 | Gérer les rôles et permissions               | - Attribution de rôles<br>- Modification de permissions                                  |
| AD-03 | Modérer le contenu signalé                   | - Queue de signalements<br>- Actions (valider/supprimer/bannir)                          |
| AD-04 | Consulter les statistiques globales          | - Nombre d'utilisateurs par rôle<br>- Volume de transactions<br>- Indicateurs d'activité |
| AD-05 | Gérer les paramètres de la plateforme        | - Configuration globale<br>- Règles de publication                                       |
| AD-06 | Consulter les logs système                   | - Logs d'erreurs<br>- Logs d'activité sensibles                                          |
| AD-07 | Gérer les intégrations externes (API keys)   | - Configuration des services tiers<br>- Rotation des clés                                |
| AD-08 | Effectuer des actions de maintenance         | - Mode maintenance<br>- Nettoyage de données                                             |
| AD-09 | Gérer les paiements et commissions           | - Suivi des revenus plateforme<br>- Configuration des taux                               |
| AD-10 | Bannir ou suspendre des comptes              | - Raison documentée<br>- Durée configurable                                              |

---

## Modérateur

**En tant que** modérateur
**Je veux** pouvoir vérifier et modérer le contenu publié
**Afin de** maintenir un environnement sûr et de qualité

| ID   | User Story                                        | Acceptance Criteria                                               |
| ---- | ------------------------------------------------- | ----------------------------------------------------------------- |
| M-01 | Modérer les annonces nouvellement créées          | - Queue de validation<br>- Aperçu complet de l'annonce            |
| M-02 | Signaler et supprimer les contenus inappropriés   | - Motif de suppression<br>- Notification à l'auteur               |
| M-03 | Vérifier les profils utilisateurs signalés        | - Historique de l'utilisateur<br>- Actions appropriées            |
| M-04 | Gérer les messages et signalements de harcèlement | - Consultation des messages<br>- Blocage si nécessaire            |
| M-05 | Valider les photos de biens                       | - Vérification de l'authenticité<br>- Rejet des photos trompeuses |
| M-06 | Consulter les statistiques de modération          | - Nombre d'actions effectuées<br>- Temps de réponse moyen         |
| M-07 | Escalader les cas complexes aux admins            | - Mécanisme d'escalade<br>- Contexte détaillé                     |

---

## Trust Agent (Vérificateur)

**En tant qu'** agent de confiance
**Je veux** pouvoir vérifier l'identité et les documents des utilisateurs
**Afin de** garantir la fiabilité des profils et prévenir les fraudes

| ID   | User Story                                              | Acceptance Criteria                                       |
| ---- | ------------------------------------------------------- | --------------------------------------------------------- |
| T-01 | Consulter les demandes de vérification en attente       | - Queue prioritaire<br>- Détails complets de la demande   |
| T-02 | Vérifier les documents d'identité (ONECI)               | - Accès aux documents uploadés<br>- Outils de validation  |
| T-03 | Vérifier les justificatifs de domicile                  | - Analyse des documents<br>- Croisement avec annonce      |
| T-04 | Valider ou rejeter une demande de vérification          | - Motif en cas de rejet<br>- Notification à l'utilisateur |
| T-05 | Demander des documents complémentaires                  | - Liste de documents requis<br>- Suivi de la réponse      |
| T-06 | Consulter l'historique de vérification d'un utilisateur | - Statut actuel<br>- Historique des demandes              |
| T-07 | Gérer les cas suspects ou frauduleux                    | - Signalement aux admins<br>- Documentation du cas        |
| T-08 | Suivre les statistiques de vérification                 | - Taux de validation<br>- Temps de traitement moyen       |

---

## Références

- **Rôles**: Définis dans `src/shared/constants/roles.ts`
- **Base de données**: Schéma Supabase avec tables `profiles`, `user_roles`, `properties`, `applications`
- **Sécurité**: Row Level Security (RLS) appliqué sur toutes les tables
