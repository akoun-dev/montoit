# Tests de Sécurité RLS - Certification ANSUT

## 📋 Vue d'ensemble

Ce document détaille tous les scénarios de tests de sécurité Row-Level Security (RLS) pour le système de certification ANSUT.

---

## 🔒 Tests Table `leases`

### Test 1.1 : Isolation des baux par utilisateur
**Scénario** : Un locataire ne doit PAS voir les baux d'autres locataires

**Commandes SQL** :
```sql
-- Se connecter en tant que locataire A (user_id = 'xxx')
SELECT * FROM leases WHERE tenant_id != auth.uid();
-- Résultat attendu : 0 lignes
```

**Résultat** : ✅ PASS / ❌ FAIL

---

### Test 1.2 : Propriétaires ne peuvent pas modifier baux d'autres propriétaires
**Scénario** : Un propriétaire ne peut PAS modifier le bail d'un autre propriétaire

**Commandes SQL** :
```sql
-- Se connecter en tant que propriétaire A
UPDATE leases 
SET monthly_rent = 999999 
WHERE landlord_id != auth.uid();
-- Résultat attendu : Permission denied
```

**Résultat** : ✅ PASS / ❌ FAIL

---

### Test 1.3 : Utilisateurs non-admin ne peuvent pas certifier
**Scénario** : Seuls les admins peuvent modifier `certification_status`

**Commandes SQL** :
```sql
-- Se connecter en tant qu'utilisateur standard
UPDATE leases 
SET certification_status = 'certified', 
    ansut_certified_at = now() 
WHERE id = 'some-lease-id';
-- Résultat attendu : Permission denied ou policy violation
```

**Résultat** : ✅ PASS / ❌ FAIL

---

### Test 1.4 : Utilisateurs non authentifiés
**Scénario** : Utilisateur anonyme ne peut rien faire

**Commandes SQL** :
```sql
-- Sans authentification
SELECT * FROM leases;
INSERT INTO leases (...) VALUES (...);
-- Résultat attendu : No rows / Permission denied
```

**Résultat** : ✅ PASS / ❌ FAIL

---

## 📜 Tests Table `lease_certification_history`

### Test 2.1 : Seuls admins et parties du bail peuvent voir l'historique
**Scénario** : Un utilisateur externe ne peut PAS voir l'historique d'un bail

**Commandes SQL** :
```sql
-- Se connecter en tant qu'utilisateur C (ni propriétaire ni locataire)
SELECT * FROM lease_certification_history 
WHERE lease_id = 'some-lease-id';
-- Résultat attendu : 0 lignes
```

**Résultat** : ✅ PASS / ❌ FAIL

---

### Test 2.2 : Utilisateurs standards ne peuvent pas insérer
**Scénario** : Seuls les admins peuvent créer des entrées d'historique

**Commandes SQL** :
```sql
-- Se connecter en tant qu'utilisateur standard
INSERT INTO lease_certification_history (lease_id, admin_id, action, status)
VALUES ('xxx', auth.uid(), 'test', 'certified');
-- Résultat attendu : Permission denied
```

**Résultat** : ✅ PASS / ❌ FAIL

---

## 📄 Tests Table `lease_documents`

### Test 3.1 : Isolation des documents par bail
**Scénario** : Un utilisateur ne peut voir QUE les documents des baux où il est partie

**Commandes SQL** :
```sql
-- Se connecter en tant que locataire A
SELECT * FROM lease_documents 
WHERE lease_id IN (
  SELECT id FROM leases WHERE tenant_id != auth.uid() AND landlord_id != auth.uid()
);
-- Résultat attendu : 0 lignes
```

**Résultat** : ✅ PASS / ❌ FAIL

---

### Test 3.2 : Upload limité aux parties du bail
**Scénario** : Un utilisateur externe ne peut PAS uploader de documents pour un bail

**Commandes SQL** :
```sql
-- Se connecter en tant qu'utilisateur C (externe)
INSERT INTO lease_documents (lease_id, uploaded_by, name, file_url, document_type)
VALUES ('lease-id-owned-by-others', auth.uid(), 'test.pdf', 'url', 'contract');
-- Résultat attendu : Permission denied
```

**Résultat** : ✅ PASS / ❌ FAIL

---

## 👥 Tests Table `user_roles`

### Test 4.1 : Utilisateur ne peut pas s'auto-promouvoir
**Scénario** : Un utilisateur standard ne peut PAS s'attribuer le rôle `admin`

**Commandes SQL** :
```sql
-- Se connecter en tant qu'utilisateur standard
INSERT INTO user_roles (user_id, role)
VALUES (auth.uid(), 'admin');
-- Résultat attendu : Permission denied
```

**Résultat** : ✅ PASS / ❌ FAIL

---

### Test 4.2 : Seuls super_admins peuvent promouvoir
**Scénario** : Un admin simple ne peut PAS promouvoir un utilisateur en super_admin

**Commandes SQL** :
```sql
-- Se connecter en tant qu'admin (mais pas super_admin)
SELECT promote_to_super_admin('target-user-id');
-- Résultat attendu : Only super-admins can promote users to super-admin
```

**Résultat** : ✅ PASS / ❌ FAIL

---

## 🎨 Tests Table `properties`

### Test 5.1 : Seules propriétés approuvées sont publiques
**Scénario** : Utilisateur standard voit seulement les propriétés avec `moderation_status = 'approved'`

**Commandes SQL** :
```sql
-- Se connecter en tant qu'utilisateur standard (non propriétaire)
SELECT * FROM properties WHERE moderation_status != 'approved';
-- Résultat attendu : 0 lignes (sauf ses propres propriétés)
```

**Résultat** : ✅ PASS / ❌ FAIL

---

## 📊 Résumé des Tests

| Test | Description | Status |
|------|-------------|--------|
| 1.1 | Isolation baux locataire | ⬜ |
| 1.2 | Isolation baux propriétaire | ⬜ |
| 1.3 | Certification admin uniquement | ⬜ |
| 1.4 | Utilisateurs anonymes | ⬜ |
| 2.1 | Historique certification | ⬜ |
| 2.2 | Insert historique | ⬜ |
| 3.1 | Isolation documents | ⬜ |
| 3.2 | Upload documents | ⬜ |
| 4.1 | Auto-promotion admin | ⬜ |
| 4.2 | Promotion super_admin | ⬜ |
| 5.1 | Propriétés publiques | ⬜ |

---

## 🔧 Corrections nécessaires

*À remplir après exécution des tests*

### Problème détecté :
- Description du problème
- Policy concernée
- Correction proposée

---

## 📅 Historique des tests

| Date | Testeur | Résultat global | Notes |
|------|---------|-----------------|-------|
| 2025-01-XX | - | - | Tests initiaux |
