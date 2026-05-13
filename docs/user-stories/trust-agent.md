# User Stories - Trust Agent (Vérificateur)

## Vérification d'Identité

| ID        | User Story                                                                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-TA-001 | En tant que trust agent, je wants consulter les documents ONECI soumis afin de vérifier l'identité des utilisateurs                                     |
| US-TA-002 | En tant que trust agent, je wants vérifier la photo d'identité avec reconnaissance faciale afin de confirmer que le document appartient à l'utilisateur |
| US-TA-003 | En tant que trust agent, je wants suivre le workflow de validation des documents afin d'assurer un traitement complet                                   |
| US-TA-004 | En tant que trust agent, je wants demander des documents supplémentaires si ceux fournis sont insuffisants afin de compléter la vérification            |
| US-TA-005 | En tant que trust agent, je wants valider ou rejeter un document ONECI afin de statuer sur l'authenticité                                               |
| US-TA-006 | En tant que trust agent, je wants ajouter un commentaire sur une décision de validation afin de justifier le choix                                      |
| US-TA-007 | En tant que trust agent, je wants consulter l'historique des validations pour un utilisateur afin de suivre l'évolution de son dossier                  |

## Validation de Dossiers

| ID        | User Story                                                                                                                                   |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| US-TA-010 | En tant que trust agent, je wants consulter et valider les dossiers complets des locataires afin de certifier leur solvabilité               |
| US-TA-011 | En tant que trust agent, je wants consulter et valider les dossiers des propriétaires afin de certifier leur légitimité                      |
| US-TA-012 | En tant que trust agent, je wants consulter et valider les dossiers des agences afin de certifier leur professionnalisme                     |
| US-TA-013 | En tant que trust agent, je wants revoir une demande de candidature complète afin d'évaluer l'ensemble du profil                             |
| US-TA-014 | En tant que trust agent, je wants vérifier les justificatifs de revenus (fiches de paie, avis d'imposition) afin de confirmer la solvabilité |
| US-TA-015 | En tant que trust agent, je wants vérifier les justificatifs de domicile afin de confirmer l'adresse de l'utilisateur                        |
| US-TA-016 | En tant que trust agent, je wants consulter les garanties (caution, assurance) afin d'évaluer la sécurité du dossier                         |
| US-TA-017 | En tant que trust agent, je wants demander des précisions sur des éléments douteux d'un dossier afin d'éclaircir la situation                |

## Gestion des Missions

| ID        | User Story                                                                                                                          |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| US-TA-020 | En tant que trust agent, je wants consulter mon calendrier de missions afin d'organiser mes interventions                           |
| US-TA-021 | En tant que trust agent, je wants accepter ou refuser une mission de vérification de bien afin de gérer ma disponibilité            |
| US-TA-022 | En tant que trust agent, je wants compléter les missions de vérification de biens sur le terrain afin de confirmer l'état des lieux |
| US-TA-023 | En tant que trust agent, je wants effectuer des tâches de vérification par photo afin de valider des éléments à distance            |
| US-TA-024 | En tant que trust agent, je wants effectuer des tâches de vérification documentaire afin de traiter les dossiers administratifs     |
| US-TA-025 | En tant que trust agent, je wants signaler la completion d'une mission afin de libérer le dossier pour la suite                     |
| US-TA-026 | En tant que trust agent, je wants consulter le détail des missions à venir afin de me préparer aux interventions                    |
| US-TA-027 | En tant que trust agent, je wants voir la priorité des missions afin de traiter d'abord les plus urgentes                           |

## Certification des Utilisateurs

| ID        | User Story                                                                                                                               |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| US-TA-030 | En tant que trust agent, je wants consulter le processus de certification d'un utilisateur afin de suivre les étapes                     |
| US-TA-031 | En tant que trust agent, je wants déclencher la certification d'un utilisateur dont le dossier est complet afin de lui accorder le badge |
| US-TA-032 | En tant que trust agent, je wants certifier un bien immobilier après vérification sur le terrain afin de garantir son authenticité       |
| US-TA-033 | En tant que trust agent, je wants consulter l'historique des certifications afin de tracer les décisions passées                         |
| US-TA-034 | En tant que trust agent, je wants voir la liste des utilisateurs certifiés afin d'identifier les profils de confiance                    |
| US-TA-035 | En tant que trust agent, je wants révoquer une certification en cas de fraude découverte afin de maintenir l'intégrité du système        |
| US-TA-036 | En tant que trust agent, je wants ajouter des notes de certification afin de justifier les décisions                                     |
| US-TA-037 | En tant que trust agent, je wants consulter les badges et niveaux de confiance afin d'identifier les niveaux de certification            |

## Gestion des Litiges

| ID        | User Story                                                                                                                              |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| US-TA-040 | En tant que trust agent, je wants consulter la liste des litiges en cours afin de gérer les cas                                         |
| US-TA-041 | En tant que trust agent, je wants voir les détails d'un litige (parties, motif, preuves) afin de comprendre le dossier                  |
| US-TA-042 | En tant que trust agent, je wants investiguer un litige afin de recueillir des informations complémentaires                             |
| US-TA-043 | En tant que trust agent, je wants contacter les parties impliquées afin d'obtenir leur version des faits                                |
| US-TA-044 | En tant que trust agent, je wants documenter la procédure de résolution afin d'assurer la traçabilité                                   |
| US-TA-045 | En tant que trust agent, je wants proposer une solution de résolution afin de clore le litige                                           |
| US-TA-046 | En tant que trust agent, je wants consulter l'historique des litiges résolus afin de s'appuyer sur des précédents                       |
| US-TA-047 | En tant que trust agent, je wants escalader un litige complexe aux admins si nécessaire afin d'obtenir une décision de niveau supérieur |

## Gestion des Agents de Terrain

| ID        | User Story                                                                                                                          |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| US-TA-050 | En tant que trust agent, je wants gérer les agents de terrain sous ma supervision afin d'organiser les équipes                      |
| US-TA-051 | En tant que trust agent, je wants assigner des tâches de vérification aux agents de terrain afin de distribuer la charge de travail |
| US-TA-052 | En tant que trust agent, je wants suivre l'avancement des tâches assignées afin de s'assurer qu'elles sont traitées                 |
| US-TA-053 | En tant que trust agent, je wants consulter les performances des agents de terrain afin d'évaluer leur efficacité                   |
| US-TA-054 | En tant que trust agent, je wants consulter les rapports de terrain des agents afin de prendre connaissance des résultats           |
| US-TA-055 | En tant que trust agent, je wants donner du feedback aux agents de terrain afin d'améliorer leurs performances                      |
| US-TA-056 | En tant que trust agent, je wants consulter la disponibilité des agents de terrain afin d'assigner les missions efficacement        |

## Rapports et Statistiques

| ID        | User Story                                                                                                                                         |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-TA-060 | En tant que trust agent, je wants consulter les statistiques de vérification afin d'évaluer mon activité                                           |
| US-TA-061 | En tant que trust agent, je wants voir les métriques de temps de traitement moyen par type de dossier afin d'identifier les goulots d'étranglement |
| US-TA-062 | En tant que trust agent, je wants consulter les taux de validation (acceptés, rejetés, demandes d'info) afin de mesurer l'efficacité               |
| US-TA-063 | En tant que trust agent, je wants générer des rapports de performance des agents de terrain afin de communiquer les résultats                      |
| US-TA-064 | En tant que trust agent, je wants voir le nombre de dossiers traités par période afin de tracer l'activité                                         |
| US-TA-065 | En tant que trust agent, je wants consulter les statistiques de certification par type d'utilisateur afin d'identifier les tendances               |
| US-TA-066 | En tant que trust agent, je wants exporter mes rapports pour les partager avec la hiérarchie afin de faciliter le reporting                        |

## Communication

| ID        | User Story                                                                                                                                                       |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-TA-070 | En tant que trust agent, je wants contacter les utilisateurs pour demander des documents complémentaires afin de compléter les dossiers                          |
| US-TA-071 | En tant que trust agent, je wants communiquer avec les admins pour signaler des problèmes ou fraudes afin d'assurer la remontée d'information                    |
| US-TA-072 | En tant que trust agent, je wants envoyer des notifications aux utilisateurs pour les informer de l'avancement de leur dossier afin de les tenir au courant      |
| US-TA-073 | En tant que trust agent, je wants consulter l'historique des communications avec un utilisateur afin de retracer les échanges                                    |
| US-TA-074 | En tant que trust agent, je wants communiquer avec les autres trust agents pour partager des informations sur les dossiers complexes afin d'assurer la cohérence |

## Tableau de Bord Trust Agent

| ID        | User Story                                                                                                                                    |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| US-TA-080 | En tant que trust agent, je wants accéder à un tableau de bord personnel afin d'avoir une vue synthétique de mon activité                     |
| US-TA-081 | En tant que trust agent, je wants voir le nombre de dossiers en attente afin de prioriser mon travail                                         |
| US-TA-082 | En tant que trust agent, je wants voir mes missions du jour afin d'organiser ma journée                                                       |
| US-TA-083 | En tant que trust agent, je wants voir mes statistiques de performance (dossiers traités, taux de validation) afin d'auto-évaluer mon travail |
| US-TA-084 | En tant que trust agent, je wants voir les alertes et urgences afin de prioriser les actions critiques                                        |
| US-TA-085 | En tant que trust agent, je wants accéder rapidement à mes fonctionnalités favorites depuis le tableau de bord afin de gagner du temps        |

## Gestion des Priorités

| ID        | User Story                                                                                                                             |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| US-TA-090 | En tant que trust agent, je wants consulter la priorité des dossiers (normale, haute, urgente) afin d'optimiser mon organisation       |
| US-TA-091 | En tant que trust agent, je wants réorganiser l'ordre de traitement des dossiers selon ma propre méthode afin d'être plus efficace     |
| US-TA-092 | En tant que trust agent, je wants signaler un dossier comme prioritaire s'il nécessite un traitement rapide afin d'attirer l'attention |
| US-TA-093 | En tant que trust agent, je wants mettre un dossier en attente en attendant des informations afin de le retrouver plus facilement      |
| US-TA-094 | En tant que trust agent, je wants consulter les dossiers qui dépassent les délais de traitement normaux afin de traiter les retards    |

## Formation et Documentation

| ID        | User Story                                                                                                                                      |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| US-TA-100 | En tant que trust agent, je wants consulter les guides de procédures de vérification afin de suivre les standards                               |
| US-TA-101 | En tant que trust agent, je wants accéder à la documentation sur les types de documents acceptés afin d'identifier rapidement les justificatifs |
| US-TA-102 | En tant que trust agent, je wants consulter les critères de certification afin d'appliquer les règles correctement                              |
| US-TA-103 | En tant que trust agent, je wants accéder aux formations mises à disposition afin de mettre à jour mes connaissances                            |
| US-TA-104 | En tant que trust agent, je wants consulter les FAQ sur les cas complexes afin de trouver des réponses rapides                                  |

## Sécurité et Intégrité

| ID        | User Story                                                                                                           |
| --------- | -------------------------------------------------------------------------------------------------------------------- |
| US-TA-110 | En tant que trust agent, je wants signaler les cas de fraude suspectée afin de protéger la plateforme                |
| US-TA-111 | En tant que trust agent, je wants consulter les alertes de fraude automatiques afin d'être informé des cas suspects  |
| US-TA-112 | En tant que trust agent, je wants documenter toutes mes décisions de validation afin d'assurer la traçabilité        |
| US-TA-113 | En tant que trust agent, je wants consulter les règles de déontologie afin de respecter les standards professionnels |
| US-TA-114 | En tant que trust agent, je wants modifier mon mot de passe régulièrement afin de sécuriser mon compte               |
