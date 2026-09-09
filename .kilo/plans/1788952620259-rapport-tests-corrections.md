# Plan de correction du rapport ANSUT

## Périmètre et décisions

- Corriger tous les constats du rapport sauf l’envoi OTP : le fonctionnement OTP est confirmé par l’utilisateur et reste hors périmètre.
- Conserver les données métier nécessaires aux baux, candidatures, paiements et audits lors d’une suppression de compte ; désactiver le compte et anonymiser les données personnelles.
- Faire du dossier locatif `VALIDATED` contenant réellement les pièces obligatoires la seule source d’éligibilité à une candidature. Ne jamais créer une candidature avec un `DRAFT` si un dossier validé existe.
- Conserver les contrôles serveur même lorsque les contrôles d’interface sont ajoutés.

## 1. Dossier locataire et candidatures

1. Extraire une résolution unique du dossier locatif courant, réutilisable par `/api/applications`, `/api/rental-file`, `/api/scoring` et les écrans concernés. Elle devra vérifier le statut, la présence de `ID_CARD` et, selon la règle métier existante, les documents obligatoires effectivement présents.
2. Corriger `POST /api/applications` pour refuser explicitement une candidature si aucun dossier validé complet n’existe, et pour référencer ce dossier validé au lieu de chercher/créer silencieusement un brouillon. Vérifier l’expiration et les doublons dans le même flux.
3. Corriger `/api/scoring` afin que le composant « Dossier locataire » ne soit approuvé et crédité de 50 points que si la même condition de complétude est satisfaite. Le score, le libellé et la progression de l’écran Vérifications devront alors rester cohérents avec la soumission.
4. Adapter `GET /api/applications` et `GET /api/applications/[id]` pour enrichir les candidatures à partir du dossier référencé, exposer les documents utiles en lecture et utiliser la même timeline/statut. Corriger au passage l’association des baux dans la liste si elle utilise actuellement l’identifiant du dossier au lieu de celui de la candidature.
5. Conserver le clic de la carte « Mes candidatures » et ajouter/valider une action explicite « Voir le détail » accessible au locataire ; le détail devra rester en lecture seule après soumission/validation et ne devra pas exposer les actions réservées au propriétaire.
6. Dans `PropertyDetailView`, charger l’état de candidature de l’utilisateur pour le bien ou le récupérer après soumission. Remplacer le bouton par un état « Candidature soumise » désactivé, empêcher l’ouverture d’un second flux et réinitialiser cet état lors du changement de bien.
7. Ajouter des tests API et composants couvrant : dossier validé avec pièce, dossier marqué validé sans pièce, dossier brouillon, candidature refusée côté serveur, affichage du détail, et bouton déjà soumis.

## 2. Messagerie propriétaire/locataire

1. Corriger l’action « Contacter » dans le détail d’une candidature pour transmettre le `tenant_id` réel et le `property_id` à l’API de création de conversation, créer ou réutiliser la conversation de façon idempotente, puis ouvrir la conversation créée dans la messagerie.
2. Étendre `/api/messages/contacts` pour que le propriétaire puisse retrouver le locataire d’une candidature soumise/validée, même avant création d’un bail. Limiter le résultat aux locataires liés à ses biens et candidatures autorisées, sans rendre la recherche globale.
3. Aligner `/api/locataire/my-recipients`, `/api/messages/send` et le composant `ContactDialog` sur cette même règle d’autorisation. Préserver la recherche par nom et le contexte du bien, et afficher une erreur exploitable lorsqu’un contact n’est plus autorisé.
4. Ajouter des tests d’autorisation et d’idempotence : candidature sans bail, bail en attente, bail actif, autre propriétaire, conversation existante et clic répété.

## 3. Baux propriétaire

1. Expliquer et corriger le constat « Supprimer le bail » en alignant le bouton `EnhancedLeases` sur le contrat de `DELETE /api/leases/[id]` : action visible seulement pour un bail non signé `DRAFT` ou `PENDING_SIGNATURE`, confirmation explicite, suppression contrôlée et rafraîchissement de la liste.
2. Vérifier le retour de l’API de suppression et traiter les erreurs Supabase au lieu de considérer toute requête comme réussie. Ne jamais permettre la suppression d’un bail signé ou actif ; conserver la résiliation pour ces cas.
3. Ajouter des tests UI/API pour les statuts supprimables et non supprimables, le contrôle propriétaire et la mise à jour de l’interface après succès.

## 4. Recherches enregistrées

1. Exploiter la table `search_alerts` déjà présente dans `20260525000000_create_search_alerts.sql` en ajoutant une API authentifiée CRUD, avec validation des bornes, types de biens, nom, prix et activation. Utiliser l’identité de session côté serveur et ne jamais accepter `user_id` du client.
2. Ajouter une section/écran locataire « Recherches enregistrées » accessible depuis « Mes favoris » ou la navigation, listant les recherches, leurs critères, leur statut actif et les actions modifier, activer/désactiver et supprimer.
3. Ajouter à `SearchProperties` un bouton « Enregistrer la recherche » après recherche, une boîte de dialogue de nommage, la restauration des critères depuis une recherche et des validations `min <= max`.
4. Préserver le fonctionnement de `check_search_alerts()` et connecter les notifications existantes à la recherche correspondante. Ajouter tests CRUD, isolation entre utilisateurs, valeurs négatives et restauration de critères.

## 5. Fiche bien : documents et biens similaires

1. Rendre la lecture de `/api/properties/[id]/documents` compatible avec un locataire authentifié autorisé à consulter un bien actif, tout en conservant l’écriture réservée au propriétaire/agence. Retourner les documents publiables avec URL et métadonnées nécessaires.
2. Charger et afficher les documents du bien dans `PropertyDetailView`, avec un état vide explicite et une ouverture/téléchargement accessible sur mobile et desktop. Ne pas exposer les documents privés ou les documents d’un bien non accessible.
3. Ajouter dans `GET /api/properties/[id]` une liste de biens similaires calculée par critères disponibles (type, ville/commune, fourchette de prix, surface), excluant le bien courant et les biens non actifs, avec limite et ordre déterministes.
4. Afficher la section « Biens similaires » dans le détail et rendre chaque carte navigable vers son détail. Tester absence de résultats, bien courant exclu et filtrage de statut.

## 6. Validation des nombres négatifs

1. Introduire des helpers partagés de validation numérique positive/non négative dans `src/lib/validators.ts`.
2. Appliquer côté recherche aux loyers minimum/maximum et aux champs de surface lorsqu’ils existent : normaliser la saisie, empêcher les valeurs négatives, afficher une erreur et bloquer la requête tant que les bornes sont invalides.
3. Auditer les formulaires numériques d’annonces, baux, revenus, charges, dépôt, paiements et autres filtres ; appliquer les mêmes bornes côté API avant conversion en `Number`, notamment dans les routes propriétés, baux et candidatures.
4. Ajouter tests unitaires des validateurs, tests de routes avec `-1`, valeurs décimales invalides, valeurs vides et bornes inversées.

## 7. Suppression de compte locataire

1. Ajouter une route authentifiée dédiée à la demande de suppression, avec confirmation forte côté interface et contrôle des opérations incompatibles éventuelles (par exemple bail actif à conserver/anonymiser selon la politique métier).
2. Implémenter une transaction/service d’anonymisation : désactiver `users`, remplacer les informations personnelles par des valeurs neutres, supprimer les sessions, OTP, favoris, alertes de recherche et autres données non nécessaires, anonymiser messages/audits/documents lorsque leur conservation est requise, puis révoquer l’accès Supabase Auth si le compte utilise Supabase Auth.
3. Rendre l’opération idempotente, journaliser l’action sans conserver de données personnelles dans le détail d’audit, et retourner un résultat uniforme pour permettre la déconnexion locale.
4. Ajouter dans l’onglet Sécurité de `src/components/dashboard/locataire/settings/index.tsx` une zone destructive avec explication, confirmation et gestion des erreurs/succès. Ajouter tests d’autorisation, d’idempotence et de conservation des relations métier.

## 8. Accès au dossier locatif depuis les paramètres

1. Dans l’onglet Vérifications et/ou Profil locataire, afficher une action « Consulter / modifier mon dossier locatif » dès qu’un dossier existe, en réutilisant l’état déjà chargé par `SettingsSection`.
2. Naviguer vers `rental-file` avec retour vers les paramètres et conserver le comportement lecture seule pour un dossier soumis/validé ; permettre la modification uniquement dans les statuts compatibles, avec resoumission contrôlée.
3. Corriger les libellés et progressions pour distinguer documents présents, documents validés et documents requis, afin d’éviter l’affichage « Complété » lorsque la pièce obligatoire manque.
4. Ajouter un test de navigation et un test de cohérence de statut/progression.

## Ordre d’implémentation et validation globale

1. Commencer par le service/règle de complétude du dossier et ses tests, puis corriger les routes candidature/scoring et leurs composants.
2. Enchaîner avec messagerie et baux, car ces flux conditionnent les tests de contractualisation bloqués dans le rapport.
3. Ajouter documents/biens similaires, recherches enregistrées, validation numérique et suppression de compte.
4. Mettre à jour les migrations/types Supabase et ajouter les tests API/unitaires/component nécessaires dans `src/test`, puis les scénarios Playwright locataire/propriétaire.
5. Vérifier avec `npm run lint`, `npm run test:run`, `npm run build` et les scénarios `npm run test:e2e` ciblant : dossier complet → candidature → détail, contact propriétaire → conversation, suppression de bail non signé, recherche sauvegardée → alerte, documents/similaires, saisie négative et suppression de compte.

## Risques à contrôler

- Les données historiques peuvent référencer plusieurs dossiers locatifs ; toute résolution doit être déterministe et ne pas réassocier silencieusement une candidature à un mauvais dossier.
- Les documents de bien peuvent être sensibles ; séparer strictement lecture publique publiée et gestion propriétaire.
- La suppression de compte ne doit pas casser les clés étrangères des baux, paiements, notifications ou audits conservés.
- Les règles de contact doivent autoriser le parcours candidature sans ouvrir une recherche de contacts arbitraire.
- Les caches `/api/applications`, `/api/properties`, `/api/scoring` et `/api/dashboard` doivent être invalidés après chaque mutation concernée.
