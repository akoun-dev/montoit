# EPIC 8 : Authentification à deux facteurs (2FA) - Documentation

## 📋 Vue d'ensemble

L'EPIC 8 implémente un système complet d'authentification à deux facteurs (2FA) pour renforcer la sécurité des comptes administrateurs sur Mon Toit.

---

## 🎯 Objectifs atteints

### Phase 1 : Backend (Base de données + RLS)

✅ **Tables créées :**
- `mfa_backup_codes` : Stocke les codes de récupération hashés (SHA-256)
- `mfa_login_attempts` : Suivi des tentatives de connexion pour rate limiting
- `mfa_policies` : Définit les politiques de 2FA par rôle
- Extension de `admin_audit_logs` avec `action_metadata` pour les événements 2FA

✅ **Fonctions RPC créées :**
- `verify_backup_code(_backup_code TEXT)` : Vérifie et marque un code de récupération comme utilisé
- `check_mfa_rate_limit()` : Vérifie si l'utilisateur a dépassé la limite de tentatives (5/15min)
- `log_mfa_attempt(_success BOOLEAN, _attempt_type TEXT)` : Log les tentatives de connexion
- `get_mfa_metrics()` : Retourne les statistiques 2FA pour les admins

✅ **Politiques RLS :**
- Tous les utilisateurs peuvent voir leurs propres codes de récupération
- Les admins peuvent voir toutes les tentatives MFA
- Les super admins peuvent modifier les politiques 2FA

---

### Phase 2 : Frontend (Composants React)

✅ **Composants créés/améliorés :**

#### `TwoFactorSetup.tsx` (amélioré)
- Génération automatique de 10 codes de récupération lors de l'activation
- Affichage du statut 2FA (actif/inactif)
- Affichage des codes restants
- Bouton de désactivation avec confirmation
- Alertes si 2FA obligatoire
- Audit complet : log de l'activation, désactivation, génération de codes

#### `TwoFactorVerify.tsx` (amélioré)
- Support des codes TOTP et codes de récupération
- Basculement entre les deux méthodes
- Rate limiting : max 5 tentatives / 15 minutes
- Alertes visuelles en cas de blocage
- Log de toutes les tentatives (succès/échec)

#### `BackupCodesDisplay.tsx` (nouveau)
- Affiche les 10 codes de récupération générés
- Téléchargement au format TXT
- Avertissements de sécurité
- Compteur de codes restants

#### `MfaSecurityMonitor.tsx` (nouveau)
- Dashboard de monitoring pour les admins
- Statistiques globales : total admins, admins avec 2FA, codes utilisés/inutilisés
- Liste des admins avec statut 2FA
- Alertes pour admins sans 2FA obligatoire
- Dernière tentative de connexion

#### `useMfaStatus.tsx` (nouveau hook)
- Récupère le statut 2FA de l'utilisateur
- Compte les codes de récupération restants
- Vérifie si la 2FA est obligatoire pour le rôle
- Fonction `refreshStatus()` pour mise à jour

---

### Phase 3 : Protection contre les attaques

✅ **Rate limiting implémenté :**
- Max 5 tentatives échouées en 15 minutes
- Blocage automatique après dépassement
- Reset automatique après 15 minutes
- Log de toutes les tentatives

✅ **Audit et traçabilité :**
- Tous les événements 2FA sont loggés dans `admin_audit_logs`
- Événements trackés :
  - `mfa_enabled` : Activation de la 2FA
  - `mfa_disabled` : Désactivation de la 2FA
  - `mfa_backup_codes_generated` : Génération des codes de récupération
  - `mfa_backup_code_used` : Utilisation d'un code de récupération
  - Tentatives de connexion (succès/échec)

✅ **Edge Function : `send-mfa-notification`**
- Envoi d'emails via Brevo pour :
  - Activation de la 2FA
  - Désactivation de la 2FA
  - Utilisation d'un code de récupération (avec alerte si < 3 codes restants)
  - 5 tentatives échouées (alerte sécurité)

---

### Phase 4 : Monitoring et Analytics

✅ **Dashboard admin intégré :**
- Nouvel onglet "Sécurité 2FA" dans `AdminDashboard`
- Composant `MfaSecurityMonitor` avec :
  - Métriques globales (cards)
  - Liste des admins avec statut 2FA
  - Alertes pour admins sans 2FA
  - Dernière connexion

✅ **Fonction de métriques :**
- `get_mfa_metrics()` : Statistiques agrégées
  - Total d'admins
  - Admins avec 2FA activée
  - % d'adoption
  - Codes utilisés/inutilisés

---

## 🔐 Sécurité

### Hashage des codes de récupération
- **Algorithme :** SHA-256
- **Stockage :** Uniquement les hash sont stockés en base
- **Vérification :** Hash du code fourni comparé au hash stocké

### Rate limiting
- **Limite :** 5 tentatives échouées en 15 minutes
- **Portée :** Par utilisateur
- **Reset :** Automatique après 15 minutes

### Politiques 2FA par rôle
| Rôle | 2FA obligatoire | Période de grâce |
|------|----------------|------------------|
| super_admin | ✅ | 3 jours |
| admin | ✅ | 7 jours |
| tiers_de_confiance | ❌ | - |
| user | ❌ | - |

---

## 📊 Utilisation

### Pour les utilisateurs

#### Activer la 2FA
1. Aller dans Profil
2. Cliquer sur "Activer 2FA"
3. Scanner le QR code avec une app d'authentification (Google Authenticator, Authy, etc.)
4. Entrer le code de vérification à 6 chiffres
5. **Important :** Télécharger et sauvegarder les 10 codes de récupération

#### Se connecter avec 2FA
1. Entrer email et mot de passe
2. Entrer le code à 6 chiffres de l'app d'authentification
3. Si perdu l'accès à l'app : cliquer sur "Utiliser un code de récupération"

#### Désactiver la 2FA
1. Aller dans Profil
2. Cliquer sur "Désactiver 2FA"
3. Confirmer l'action (⚠️ réduit la sécurité)

### Pour les administrateurs

#### Dashboard de monitoring
1. Aller dans Dashboard Admin
2. Onglet "Sécurité 2FA"
3. Vue d'ensemble :
   - Total admins
   - Admins avec 2FA
   - % d'adoption
   - Codes de récupération utilisés/inutilisés
4. Liste des admins avec :
   - Statut 2FA (activé/désactivé)
   - Rôle
   - Codes restants
   - Dernière connexion

#### Gérer les politiques 2FA (super admins uniquement)
- Les politiques par défaut sont définies en base de données
- Modifications possibles via SQL uniquement (sécurité)

---

## 🧪 Tests

### Tests fonctionnels réalisés
✅ Activation de la 2FA pour un admin
✅ Génération et affichage de 10 codes de récupération
✅ Connexion avec code TOTP valide
✅ Connexion avec code de récupération valide
✅ Désactivation de la 2FA avec confirmation
✅ Rate limiting après 5 échecs
✅ Affichage des alertes si 2FA obligatoire

### Tests de sécurité réalisés
✅ Codes de récupération hashés en SHA-256
✅ Impossible de voir les codes d'un autre utilisateur (RLS)
✅ Tentatives échouées loggées dans `admin_audit_logs`
✅ Blocage après 5 tentatives échouées
✅ Codes de récupération marqués comme utilisés (1 usage unique)

---

## 📦 Fichiers modifiés/créés

### Backend (Supabase)
- ✅ Migration : Tables `mfa_backup_codes`, `mfa_login_attempts`, `mfa_policies`
- ✅ Fonctions RPC : `verify_backup_code`, `check_mfa_rate_limit`, `log_mfa_attempt`, `get_mfa_metrics`
- ✅ Extension : Colonne `action_metadata` dans `admin_audit_logs`
- ✅ Edge Function : `send-mfa-notification/index.ts`

### Frontend (React)
- ✅ `src/hooks/useMfaStatus.tsx` (nouveau)
- ✅ `src/components/auth/BackupCodesDisplay.tsx` (nouveau)
- ✅ `src/components/admin/MfaSecurityMonitor.tsx` (nouveau)
- ✅ `src/components/auth/TwoFactorSetup.tsx` (amélioré)
- ✅ `src/components/auth/TwoFactorVerify.tsx` (amélioré)
- ✅ `src/pages/AdminDashboard.tsx` (intégration de MfaSecurityMonitor)

### Documentation
- ✅ `docs/EPIC8_2FA_IMPLEMENTATION.md` (ce fichier)
- ✅ Mise à jour de `docs/SECURITY_IMPLEMENTATION.md` (à venir)

---

## ✅ Checklist de validation

### Backend
- [x] Table `mfa_backup_codes` créée avec RLS
- [x] Table `mfa_login_attempts` créée avec RLS
- [x] Table `mfa_policies` créée avec politiques par défaut
- [x] Fonction `verify_backup_code` testée
- [x] Fonction `check_mfa_rate_limit` testée
- [x] Fonction `log_mfa_attempt` testée
- [x] Fonction `get_mfa_metrics` testée

### Frontend
- [x] Hook `useMfaStatus` fonctionnel
- [x] Composant `BackupCodesDisplay` fonctionnel
- [x] Composant `MfaSecurityMonitor` fonctionnel
- [x] `TwoFactorSetup` avec génération de codes
- [x] `TwoFactorSetup` avec désactivation
- [x] `TwoFactorVerify` avec codes de récupération
- [x] `TwoFactorVerify` avec rate limiting

### Sécurité
- [x] Codes de récupération hashés (SHA-256)
- [x] Rate limiting (5/15min)
- [x] Audit complet des événements 2FA
- [x] RLS sur toutes les tables sensibles
- [x] Alertes pour 2FA obligatoire non activée

### UX/UI
- [x] Interface claire et intuitive
- [x] Messages d'erreur explicites
- [x] Alertes de sécurité visibles
- [x] Téléchargement des codes de récupération
- [x] Dashboard admin informatif

---

## 🚀 Prochaines améliorations possibles

- [ ] Support de plusieurs appareils 2FA par utilisateur
- [ ] Régénération des codes de récupération (si < 3 restants)
- [ ] Notifications push en temps réel (via WebSocket)
- [ ] Statistiques avancées (taux d'échec par admin, etc.)
- [ ] Support de clés de sécurité matérielles (WebAuthn)
- [ ] Authentification biométrique (Touch ID, Face ID)

---

## 📞 Support

Pour toute question ou problème lié à la 2FA :
- Consulter la FAQ dans la page Profil
- Contacter le support technique
- Ouvrir une issue sur le repo GitHub

---

**Dernière mise à jour :** 2025-10-05
**Version :** 1.0.0
**Auteur :** Équipe Mon Toit
