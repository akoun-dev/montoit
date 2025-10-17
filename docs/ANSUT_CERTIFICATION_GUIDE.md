# Guide de Certification ANSUT

## Vue d'ensemble

La certification ANSUT (Agence Nationale de Sécurité Urbaine et Territoriale) est un processus officiel qui valide et certifie les baux locatifs sur la plateforme MonToit. Cette certification offre une protection juridique et une confiance accrue pour les propriétaires et locataires.

## Flux de Certification

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Création et signature du bail                              │
│     - Propriétaire crée le bail                                 │
│     - Les deux parties signent                                  │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Pré-validation automatique                                  │
│     - Vérification des signatures                               │
│     - Vérification des identités (ONECI)                        │
│     - Validation des dates et montants                          │
│     - Génération du document PDF                                │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Demande de certification                                    │
│     - Soumission par le propriétaire ou locataire               │
│     - Notification envoyée aux admins ANSUT                     │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Examen par l'admin ANSUT                                    │
│     - Vérification manuelle des informations                    │
│     - Contrôle des documents                                    │
│     - Validation finale                                         │
└─────────────────┬───────────────────────────────────────────────┘
                  │
          ┌───────┴────────┐
          │                │
          ▼                ▼
    ┌─────────┐      ┌──────────┐
    │ Approuvé │      │ Rejeté   │
    │ ou       │      │ ou       │
    │ Modif.   │      │ En révision│
    └─────────┘      └──────────┘
          │                │
          └───────┬────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. Notification des parties                                    │
│     - Email de confirmation/rejet                               │
│     - Mise à jour du statut                                     │
│     - Badge ANSUT affiché (si approuvé)                         │
└─────────────────────────────────────────────────────────────────┘
```

## Pour les Utilisateurs (Propriétaires et Locataires)

### Étape 1 : Créer et Signer le Bail

1. Le propriétaire crée le bail via l'interface "Mes Baux"
2. Les deux parties (propriétaire et locataire) doivent signer le bail
3. Un document PDF est automatiquement généré

### Étape 2 : Vérifier les Prérequis

Avant de demander la certification, assurez-vous que :

- ✅ Les deux parties ont signé le bail
- ✅ Le propriétaire a vérifié son identité via ONECI
- ✅ Le locataire a vérifié son identité via ONECI
- ✅ Le document PDF du bail a été généré
- ✅ Les dates de début et fin sont cohérentes
- ✅ Les montants (loyer, charges, caution) sont valides

**Astuce** : Utilisez le composant "Checklist de Pré-certification" pour vérifier automatiquement tous ces points.

### Étape 3 : Soumettre la Demande

1. Accédez à la page "Mes Baux"
2. Cliquez sur le bail que vous souhaitez certifier
3. Cliquez sur "Demander la certification ANSUT"
4. Vous recevrez un email de confirmation

### Étape 4 : Attendre la Décision

- Le délai moyen de traitement est de **2-5 jours ouvrables**
- Vous recevrez un email dès qu'une décision est prise
- Vous pouvez suivre le statut en temps réel dans "Mes Baux"

### Statuts Possibles

| Statut | Description | Action |
|--------|-------------|--------|
| `not_requested` | Certification non demandée | Soumettre une demande |
| `pending` | En attente d'examen | Aucune action requise |
| `in_review` | En cours d'examen | Aucune action requise |
| `certified` | ✅ Certifié par ANSUT | Félicitations ! |
| `rejected` | ❌ Rejeté | Corriger et resoumettre |
| `changes_requested` | 🔄 Modifications demandées | Apporter les corrections |

### En Cas de Rejet

Si votre demande est rejetée, vous recevrez :

1. Un email détaillant les raisons du rejet
2. Une liste des corrections à apporter
3. La possibilité de resoumettre après corrections

**Important** : Lisez attentivement les notes de l'administrateur pour comprendre ce qui doit être corrigé.

### Avantages de la Certification

- 🛡️ **Protection juridique** : Bail conforme aux normes ANSUT
- 🌟 **Confiance accrue** : Badge de certification visible
- 📈 **Visibilité** : Priorité dans les résultats de recherche
- ⚖️ **Résolution de litiges** : Assistance en cas de conflit

## Pour les Administrateurs ANSUT

### Accéder à la File de Certification

1. Connectez-vous avec votre compte admin
2. Cliquez sur "Admin Dashboard"
3. Sélectionnez "Certifications ANSUT"

### Examiner une Demande

1. Consultez la liste des demandes en attente
2. Cliquez sur "Examiner" pour une demande spécifique
3. Vérifiez :
   - Informations du propriétaire et locataire
   - Statut de vérification ONECI des deux parties
   - Dates de signature
   - Document PDF du bail
   - Conformité des montants

### Prendre une Décision

#### Approuver

1. Cliquez sur "Certifier"
2. Le bail reçoit le statut `certified`
3. Un email de confirmation est envoyé aux deux parties
4. Le badge ANSUT est affiché sur la propriété

#### Rejeter

1. Cliquez sur "Rejeter"
2. **Obligatoire** : Ajoutez des notes expliquant le rejet
3. Un email avec les raisons est envoyé aux parties
4. Les parties peuvent corriger et resoumettre

#### Demander des Modifications

1. Cliquez sur "Demander des modifications"
2. Ajoutez des notes détaillant les changements nécessaires
3. Le statut passe à `changes_requested`
4. Un email est envoyé avec les instructions

### Statistiques et Rapports

Le tableau de bord affiche :

- **Total de baux** dans le système
- **Baux certifiés** (avec pourcentage)
- **Demandes en attente** et en révision
- **Temps moyen de traitement**

### Bonnes Pratiques pour les Admins

1. **Traiter les demandes rapidement** : Objectif de 48h maximum
2. **Notes claires et précises** : Expliquez toujours vos décisions
3. **Vérifier la conformité** : Utiliser la checklist automatique
4. **Communication proactive** : Contacter les parties si besoin
5. **Historique** : Toutes vos actions sont enregistrées dans l'audit log

### Actions Enregistrées

Chaque action est automatiquement enregistrée :

- Date et heure de l'action
- Admin ayant effectué l'action
- Type d'action (approuvé, rejeté, modifications demandées)
- Notes associées
- Anciennes et nouvelles valeurs

## Critères de Certification

Un bail doit respecter les critères suivants pour être certifié :

### Critères Obligatoires ✅

1. **Signatures** : Les deux parties doivent avoir signé
2. **Identités vérifiées** : Propriétaire et locataire vérifiés ONECI
3. **Document** : PDF du bail généré et accessible
4. **Dates valides** : Date de fin > Date de début
5. **Montants cohérents** : Loyer > 0, Caution ≥ 0

### Critères Additionnels (Vérification Manuelle)

- Conformité du contrat avec la loi ivoirienne
- Cohérence des informations (adresse, surface, etc.)
- Absence de clauses abusives
- Respect des plafonds légaux (si applicable)

## FAQ

### Combien coûte la certification ?

La certification ANSUT est **gratuite** sur MonToit.

### Combien de temps est valable une certification ?

La certification est valable pour toute la durée du bail. Si le bail est renouvelé, une nouvelle certification peut être demandée.

### Puis-je modifier un bail certifié ?

Non. Toute modification nécessite une nouvelle demande de certification. L'ancienne certification est révoquée.

### Que se passe-t-il si ma demande est rejetée plusieurs fois ?

Vous pouvez resoumettre autant de fois que nécessaire après avoir apporté les corrections demandées. Si vous rencontrez des difficultés, contactez le support.

### Un bail non certifié est-il valide ?

Oui, un bail non certifié reste juridiquement valide. La certification ANSUT est un plus pour la sécurité et la confiance.

### Comment contacter l'équipe ANSUT ?

Pour toute question : support@montoit.ci

## Notifications Email

### Pour les Utilisateurs

- ✅ **Certification approuvée** : Confirmation avec badge
- ❌ **Certification rejetée** : Raisons + actions à entreprendre
- 🔄 **Modifications demandées** : Liste des corrections
- 📋 **Demande soumise** : Confirmation de réception

### Pour les Admins

- 🆕 **Nouvelle demande** : Alerte avec lien direct
- 📊 **Résumé quotidien** : Nombre de demandes en attente

## Support Technique

En cas de problème technique :

1. Vérifiez votre connexion internet
2. Actualisez la page
3. Déconnectez-vous et reconnectez-vous
4. Contactez le support : support@montoit.ci

---

**Dernière mise à jour** : Phase 5 - Décembre 2024  
**Version** : 1.0
