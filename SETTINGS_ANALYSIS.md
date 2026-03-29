# Analyse des Vues de Paramètres - Agences

## Vue d'ensemble

Ce document analyse les pages de paramètres existantes pour éviter les duplications lors de la création du menu de paramètres pour les agences.

---

## 📊 Ce qui existe déjà

### 1. Pages Agence

| Route                    | Fichier                 | Description                                 | Statut    |
| ------------------------ | ----------------------- | ------------------------------------------- | --------- |
| `/agences/parametres`    | `SettingsMenuPage.tsx`  | **Menu principal des paramètres** (nouveau) | ✅ Créé   |
| `/agences/profil`        | `ProfilePage.tsx`       | Page de profil de l'agence                  | ✅ Existe |
| `/agences/notifications` | `NotificationsPage.tsx` | Centre de notifications (liste)             | ✅ Existe |

### 2. Pages Compte (Partagées)

| Route         | Fichier                   | Description                     | Statut    |
| ------------- | ------------------------- | ------------------------------- | --------- |
| `/parametres` | `AccountSettingsPage.tsx` | Paramètres du compte (sécurité) | ✅ Existe |
| -             | -                         | Changement d'email              | ✅ Existe |
| -             | -                         | Changement de mot de passe      | ✅ Existe |
| -             | -                         | Export des données (RGPD)       | ✅ Existe |
| -             | -                         | Suppression de compte           | ✅ Existe |
| -             | -                         | Déconnexion                     | ✅ Existe |

### 3. Services

| Service                      | Méthodes                   | Description                   |
| ---------------------------- | -------------------------- | ----------------------------- |
| `notification.service.ts`    | `getUserPreferences()`     | Récupérer les préférences     |
| `notification.service.ts`    | `updateUserPreferences()`  | Mettre à jour les préférences |
| `accountDeletion.service.ts` | `requestAccountDeletion()` | Suppression RGPD              |
| `accountDeletion.service.ts` | `exportUserData()`         | Export RGPD                   |

---

## 🔴 Ce qui manque (à créer)

### Pages à créer pour Agences

| Route                               | Page                              | Description                                        | Priorité   |
| ----------------------------------- | --------------------------------- | -------------------------------------------------- | ---------- |
| `/agences/parametres/notifications` | Notification preferences page     | Préférences de notification par catégorie et canal | 🔴 Haute   |
| `/agences/parametres/securite`      | Security settings page (ou adapt) | Mot de passe, 2FA                                  | 🟡 Moyenne |
| `/agences/parametres/sessions`      | Session management page           | Appareils connectés, sessions actives              | 🟡 Moyenne |

### Autres routes (utilisées dans SettingsMenu)

| Route      | Destination existante | Action         |
| ---------- | --------------------- | -------------- |
| `/faq`     | Page FAQ publique     | ✅ Lien direct |
| `/contact` | Page contact publique | ✅ Lien direct |
| `/aide`    | Page aide publique    | ✅ Lien direct |

---

## 📋 Plan d'implémentation

### Phase 1: Préférences de notifications (Haute priorité)

**À créer:** `/agences/parametres/notifications`

**Fonctionnalités:**

- Catégories de notifications:
  - verification_result
  - document_request
  - payment
  - contract
  - message
  - system
  - profile
- Canaux: Email, SMS, Push
- Utilise `notification.service.ts` existant

**Code à réutiliser:**

- Service: `notification.service.ts`
- UI: Créer nouveau composant de toggle par catégorie/canal

### Phase 2: Sécurité (Moyenne priorité)

**Option A - Réutiliser:** Rediriger vers `/parametres` (AccountSettingsPage)

**Option B - Adapter:** Créer `/agences/parametres/securite` avec:

- Changement de mot de passe
- 2FA (si implémenté)
- Lien vers suppression de compte

### Phase 3: Sessions (Moyenne priorité)

**À créer:** `/agences/parametres/sessions`

**Fonctionnalités:**

- Liste des sessions actives
- Révoquer une session
- Révoquer toutes les sessions
- Utilise Supabase Auth Admin API

---

## 🔄 Mises à jour à faire

### AgencySettingsMenuPage.tsx

Actuellement, les liens sont:

```typescript
{
  id: 'preferences',
  label: 'Préférences de notification',
  onClick: () => navigate('/agences/parametres/notifications'), // ❌ Page à créer
},
{
  id: 'security',
  label: 'Sécurité',
  onClick: () => navigate('/agences/parametres/securite'), // ❌ Page à créer
},
{
  id: 'sessions',
  label: 'Sessions actives',
  onClick: () => navigate('/agences/parametres/sessions'), // ❌ Page à créer
},
{
  id: 'data',
  label: 'Mes données',
  onClick: () => navigate('/parametres?section=data'), // ✅ Existe (compte partagé)
},
```

---

## 🎯 Résumé

**Pages à créer:** 3

1. Notification Preferences (High priority)
2. Security Settings (Medium - peut réutiliser)
3. Session Management (Medium)

**Pages existantes à utiliser:**

- `AgencyProfilePage.tsx` - Profil agence ✅
- `AgencyNotificationsPage.tsx` - Centre de notifications ✅
- `AccountSettingsPage.tsx` - Sécurité et compte (partagé) ✅
