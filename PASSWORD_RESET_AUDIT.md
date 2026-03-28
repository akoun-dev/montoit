# Audit & Plan de Correction - Réinitialisation Mot de Passe

## 🔍 Audit Complet

### Problèmes Corrigés ✅

| #   | Problème              | Fichier                      | Correction                                             | Status |
| --- | --------------------- | ---------------------------- | ------------------------------------------------------ | ------ |
| 1   | URL redirect invalide | `auth.api.ts:147`            | `/reset-password` → `/reinitialiser-mot-de-passe`      | ✅     |
| 2   | URL redirect invalide | `password-reset/index.ts:81` | `/auth/reset-password` → `/reinitialiser-mot-de-passe` | ✅     |

---

## ⚠️ Problèmes Requérant une Action

### 🔴 Critique - Bloquant la fonctionnalité

#### 1. SMTP Non Configuré

**Emplacement**: `supabase/config.toml:187-194`

**Problème**:

```toml
# [auth.email.smtp]
# enabled = true
# host = "smtp.sendgrid.net"
# port = 587
# user = "apikey"
# pass = "env(SENDGRID_API_KEY)"
# admin_email = "admin@email.com"
# sender_name = "Admin"
```

La configuration SMTP est commentée - **les emails ne partent pas en production**.

**Impact**: Les utilisateurs ne reçoivent pas l'email de réinitialisation.

---

#### 2. Variables d'environnement manquantes

**Fichier**: `.env.example`

**Variables manquantes**:

```bash
# Configuration SMTP (optionnel si Supabase Email utilisé)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_SENDER_NAME=MonToit
SMTP_ADMIN_EMAIL=noreply@montoit.ci

# Ou configuration Supabase Email
SUPABASE_EMAIL_ENABLED=true
```

---

### 🟠 Élevé - Améliorations de sécurité

#### 3. Sécurité mot de passe désactivée

**Emplacement**: `supabase/config.toml:178`

```toml
secure_password_change = false
```

**Recommandation**: Activer pour exiger une ré-authentification avant changement de mot de passe.

---

#### 4. Double implémentation

**Fichiers**:

- `AuthProvider.tsx:463-521` - Edge Function personnalisée
- `auth.api.ts:146-152` - Supabase natif (non utilisé)

**Problème**: Deux approches différentes causent de la confusion.

**Recommandation**: Standardiser sur une seule méthode.

---

## 📋 Plan de Correction Priorisé

### Phase 1 - Critique (Pour rétablir la fonctionnalité)

#### Étape 1.1: Configurer SMTP

**Options**:

**A) Utiliser Supabase Email (Recommandé)**

- Plus simple, pas de configuration SMTP nécessaire
- Allez dans Dashboard Supabase → Authentication → Email Templates
- Activer "Enable Email"

**B) Configurer SMTP personnalisé**

```toml
# Dans supabase/config.toml
[auth.email.smtp]
enabled = true
host = "smtp.resend.com"
port = 587
user = "resend"
pass = "env(RESEND_API_KEY)"
admin_email = "noreply@montoit.ci"
sender_name = "MonToit"
```

```bash
# Dans .env.production
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

#### Étape 1.2: Personnaliser le template d'email (Optionnel)

```html
<!-- supabase/templates/recovery.html -->
<h2>Réinitialisation de votre mot de passe MonToit</h2>
<p>Bonjour {{ .Email }},</p>
<p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :</p>
<p><a href="{{ .ConfirmationURL }}">Réinitialiser mon mot de passe</a></p>
<p>Ce lien expire dans 1 heure.</p>
<p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
```

#### Étape 1.3: Activer `secure_password_change`

```toml
# Dans supabase/config.toml
[auth.email]
secure_password_change = true
```

---

### Phase 2 - Standardisation & Qualité

#### Étape 2.1: Supprimer l'implémentation dupliquée

**Action**: Conserver uniquement l'Edge Function personnalisée (`AuthProvider.tsx`) car elle offre:

- Meilleur gestion d'erreur
- Logging pour débogage
- Message générique de sécurité (ne révèle pas si l'email existe)

**Fichier à modifier**: `auth.api.ts`

```typescript
// Supprimer la fonction resetPassword inutilisée
// Garder uniquement les autres fonctions (signIn, signUp, etc.)
```

#### Étape 2.2: Améliorer la gestion des erreurs

**Fichier**: `ForgotPasswordPage.tsx:42-50`

```typescript
if (resetError) {
  // Messages plus spécifiques selon l'erreur
  if (resetError.message?.includes('rate_limit')) {
    setError('Trop de tentatives. Veuillez attendre 15 minutes avant de réessayer.');
  } else if (resetError.status === 500) {
    setError('Erreur serveur temporaire. Veuillez réessayer dans quelques instants.');
  } else {
    setError("Erreur lors de l'envoi du lien de réinitialisation. Veuillez réessayer.");
  }
  return;
}
```

---

### Phase 3 - Monitoring & Tests

#### Étape 3.1: Ajouter un logging structuré

```typescript
// Dans password-reset Edge Function
console.log('[password-reset] Request received', {
  email: normalizedEmail,
  timestamp: new Date().toISOString(),
  userAgent: req.headers.get('user-agent'),
  ip: req.headers.get('x-forwarded-for') || 'unknown',
});
```

#### Étape 3.2: Configurer les webhooks (Optionnel)

Pour recevoir des notifications quand les emails échouent:

- Dashboard Supabase → Database → Webhooks
- Créer un webhook pour les échecs d'envoi d'email

---

## ✅ Checklist de Validation

Après avoir appliqué les corrections:

- [ ] **SMTP configuré** (Supabase Email ou SMTP personnalisé)
- [ ] **Template d'email personnalisé** (optionnel mais recommandé)
- [ ] **Test en local**: `npm run dev` → Demander reset → Vérifier console
- [ ] **Test en production**: Demander reset → Vérifier email reçu
- [ ] **Test du lien**: Cliquer sur le lien dans l'email → Vérifier redirection
- [ ] **Test complet**: Nouveau mot de passe → Connexion avec nouveau mdp

---

## 🔧 Commandes Utiles

### Déployer les Edge Functions

```bash
supabase functions deploy password-reset
```

### Vérifier la configuration

```bash
supabase status
supabase config list
```

### Tester l'Edge Function localement

```bash
supabase functions serve password-reset
curl -X POST http://localhost:54321/functions/v1/password-reset \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"email":"test@example.com"}'
```

### Vérifier les logs

```bash
supabase functions logs password-reset
```

---

## 📊 Résumé

| Élément               | État           | Action requise                    |
| --------------------- | -------------- | --------------------------------- |
| URL redirect          | ✅ Corrigé     | Rien à faire                      |
| Edge Function URL     | ✅ Corrigé     | Rien à faire                      |
| Configuration SMTP    | ❌ Bloquant    | Configurer Supabase Email ou SMTP |
| Sécurité mdp          | ⚠️ À améliorer | Activer `secure_password_change`  |
| Double implémentation | ⚠️ À nettoyer  | Supprimer code inutilisé          |

---

## 🚦 Priorité d'Action

### Immédiat (Aujourd'hui)

1. **Configurer SMTP** via Supabase Dashboard ou `config.toml`

### Court terme (Cette semaine)

2. Tester le flux complet de réinitialisation
3. Activer `secure_password_change`
4. Personnaliser le template d'email

### Moyen terme (Quand possible)

5. Nettoyer le code dupliqué
6. Ajouter monitoring
7. Configurer des webhooks pour les échecs

---

## 📝 Notes Techniques

### Pourquoi l'Edge Function plutôt que le SDK natif ?

L'Edge Function personnalisée (`password-reset/index.ts`) est utilisée car elle:

1. Évite les problèmes de JWT expiré côté client
2. Permet un logging côté serveur
3. Gère les erreurs plus proprement
4. Retourne un message de sécurité (ne révèle pas si l'email existe)

### Flux actuel après corrections

```
Utilisateur → ForgotPasswordPage → AuthProvider.resetPassword()
    → Edge Function /functions/v1/password-reset
    → Supabase Auth REST API /auth/v1/recover
    → Email avec lien vers /reinitialiser-mot-de-passe
    → ResetPasswordPage (traite access_token)
    → Nouveau mot de passe enregistré
```
