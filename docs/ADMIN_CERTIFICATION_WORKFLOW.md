# Guide Admin - Workflow de Certification ANSUT

## 📋 Vue d'ensemble

Ce guide est destiné aux administrateurs et tiers de confiance responsables de la certification des baux dans Mon Toit.

---

## 🎯 Rôles et Responsabilités

### Admin
- Examiner les demandes de certification
- Approuver ou rejeter les baux
- Gérer la file d'attente de modération
- Accéder aux statistiques de certification

### Tiers de Confiance
- Même accès que les admins pour la certification
- Spécialisation dans certains types de baux
- Peut être activé/désactivé par les super_admins

---

## 🔑 Accès au Dashboard

1. Se connecter avec un compte admin
2. Vérifier que vous avez le rôle `admin` ou `tiers_de_confiance`
3. Naviguer vers `/admin/certifications`

**URL directe** : `https://votre-domaine.com/admin/certifications`

---

## 📊 Interface de Certification

### Onglets disponibles

1. **En attente** : Baux en attente d'examen (`pending`)
2. **Certifiés** : Baux approuvés (`certified`)
3. **Rejetés** : Baux refusés (`rejected`)
4. **Statistiques** : Métriques et analytics

---

## ✅ Processus d'Approbation

### Étape 1 : Examiner la demande

Vérifier les éléments suivants :

- [ ] **Signatures** : Les deux parties ont signé
- [ ] **Identité propriétaire** : ONECI vérifié
- [ ] **Identité locataire** : ONECI vérifié
- [ ] **Document PDF** : Bail généré et accessible
- [ ] **Dates valides** : `start_date` < `end_date`
- [ ] **Montants cohérents** : `monthly_rent > 0`
- [ ] **Informations complètes** : Tous les champs obligatoires remplis

### Étape 2 : Vérifier les documents

Cliquer sur "Voir les documents" pour :
- Télécharger le bail PDF
- Vérifier les pièces d'identité
- Consulter les justificatifs de revenus

### Étape 3 : Décision

#### Option A : Approuver ✅

1. Cliquer sur **"Approuver la certification"**
2. (Optionnel) Ajouter des notes internes
3. Confirmer l'action
4. Le bail passe à `certification_status = 'certified'`
5. Emails automatiques envoyés au propriétaire et locataire

#### Option B : Rejeter ❌

1. Cliquer sur **"Rejeter la certification"**
2. **OBLIGATOIRE** : Sélectionner une raison de rejet
3. Ajouter des notes explicatives détaillées
4. Confirmer l'action
5. Le bail passe à `certification_status = 'rejected'`
6. Emails automatiques avec raisons envoyés

#### Option C : Demander des modifications 🔄

1. Cliquer sur **"Demander des modifications"**
2. Lister les éléments à corriger
3. Le bail passe à `certification_status = 'changes_requested'`
4. Les parties peuvent soumettre à nouveau

---

## 📝 Bonnes Pratiques pour les Notes de Rejet

### ✅ Exemples de bonnes notes

**Problème d'identité** :
```
La pièce d'identité du locataire est expirée (date d'expiration : 15/12/2024).
Merci de fournir une CNI valide.
```

**Problème de document** :
```
Le document PDF du bail est illisible (pages 3-5).
Merci de régénérer le bail et de soumettre à nouveau.
```

**Montants incohérents** :
```
Le dépôt de garantie (150 000 FCFA) ne correspond pas à 2 mois de loyer comme indiqué dans le contrat.
Correction requise : 2 × 100 000 = 200 000 FCFA
```

### ❌ Exemples de mauvaises notes

- "Document invalide" (trop vague)
- "Problème avec le bail" (pas assez spécifique)
- "Rejeté" (aucune explication)

---

## 🎨 Templates de Notes de Rejet

### Identité non vérifiée
```
La vérification d'identité n'est pas complète pour [propriétaire/locataire].
Action requise : Compléter la vérification ONECI via la page /verification
```

### Document manquant
```
Document manquant : [Nom du document]
Merci de téléverser ce document dans la section "Documents du bail"
```

### Signatures incomplètes
```
Signatures manquantes : [propriétaire/locataire]
Les deux parties doivent signer le bail avant de demander la certification
```

### Dates invalides
```
La date de début (DD/MM/YYYY) est postérieure à la date de fin (DD/MM/YYYY).
Merci de corriger les dates du bail.
```

### Informations incomplètes
```
Informations manquantes dans le bail :
- [Champ 1]
- [Champ 2]
Merci de compléter ces informations et soumettre à nouveau.
```

---

## 📈 Statistiques de Performance

### Métriques à suivre

1. **Temps de traitement moyen** : < 48h
2. **Taux d'approbation** : ~70-80%
3. **Taux de rejet** : ~10-20%
4. **Taux de modifications demandées** : ~10%

### Alertes automatiques

- ⚠️ **> 10 demandes en attente depuis > 48h** : Prioriser le traitement
- ⚠️ **Taux de rejet > 50%** : Analyser les causes communes
- ⚠️ **Email échoué** : Vérifier la configuration BREVO

---

## 🔍 Vérifications de Sécurité

### Avant d'approuver

- [ ] Vérifier que le bail n'est pas un doublon
- [ ] Confirmer que les deux parties sont des comptes actifs
- [ ] S'assurer qu'aucune fraude n'est détectée
- [ ] Vérifier la cohérence des dates avec le calendrier

### Signaux d'alerte 🚨

- Montants de loyer anormalement élevés/bas
- Plusieurs baux pour la même propriété sur des périodes qui se chevauchent
- Identité non vérifiée mais demande de certification
- Documents de mauvaise qualité (photos floues, scans illisibles)

---

## 🛠️ Résolution de Problèmes

### Problème : Le bail n'apparaît pas dans la queue

**Causes possibles** :
- Le bail n'a pas le statut `certification_status = 'pending'`
- Les signatures ne sont pas complètes
- Le champ `certification_requested_at` est NULL

**Solution** :
Vérifier directement dans la base de données :
```sql
SELECT id, certification_status, landlord_signed_at, tenant_signed_at
FROM leases
WHERE id = 'lease-id';
```

---

### Problème : Les emails ne sont pas envoyés

**Vérifications** :
1. La clé BREVO_API_KEY est configurée
2. Les logs de l'edge function `send-certification-email`
3. Les adresses email des utilisateurs sont valides

**Debug** :
```bash
# Voir les logs de l'edge function
supabase functions logs send-certification-email
```

---

### Problème : Impossible d'approuver un bail

**Causes possibles** :
- Vous n'avez pas le rôle `admin` ou `tiers_de_confiance`
- Le bail est déjà certifié ou rejeté
- Problème de permissions RLS

**Solution** :
Vérifier vos rôles :
```sql
SELECT role FROM user_roles WHERE user_id = auth.uid();
```

---

## 📞 Support

Pour toute question ou problème technique :

- **Email** : support@montoit.ci
- **Dashboard Admin** : `/admin/certifications`
- **Documentation technique** : `/docs/ANSUT_CERTIFICATION_GUIDE.md`

---

## 📅 Historique des Modifications

| Date | Version | Modifications |
|------|---------|---------------|
| 2025-01-XX | 1.0 | Version initiale |
