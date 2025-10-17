# Configuration Sentry - Mon Toit

## 🎯 Objectif

Monitoring en production pour:
- **Erreurs runtime** capturées automatiquement
- **Session replays** pour débugger visuellement
- **Performance tracking** des Edge Functions
- **Alertes** en cas de dégradation

---

## 📋 Étapes de Configuration

### 1. Créer un Compte Sentry

1. Aller sur [sentry.io](https://sentry.io)
2. Créer un compte gratuit
3. Créer un nouveau projet:
   - Platform: **React**
   - Project name: `mon-toit-ci`
   - Alert frequency: **On every new issue**

### 2. Récupérer le DSN

Après création du projet:

1. Aller dans **Settings → Projects → mon-toit-ci → Client Keys (DSN)**
2. Copier le DSN (format: `https://[public-key]@sentry.io/[project-id]`)
3. Ajouter dans votre fichier `.env.local`:

```env
VITE_SENTRY_DSN=https://abc123...@sentry.io/123456
```

### 3. Créer un Auth Token (pour sourcemaps)

1. Aller dans **Settings → Account → API → Auth Tokens**
2. Créer un nouveau token:
   - **Name**: `mon-toit-ci-sourcemaps`
   - **Scopes**: 
     - ✅ `project:read`
     - ✅ `project:releases`
     - ✅ `org:read`
3. Copier le token et ajouter dans `.env.local`:

```env
SENTRY_AUTH_TOKEN=sntrys_abc123...
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=mon-toit-ci
```

### 4. Configurer les Alertes

#### Alert Rule 1: High Error Rate
1. **Alerts → Create Alert Rule**
2. **Conditions**:
   - When: `The issue is seen`
   - Filter: `more than 10 times in 5 minutes`
3. **Actions**:
   - ✅ Send email to team
   - ✅ Send Slack notification (optionnel)

#### Alert Rule 2: Performance Degradation  
1. **Alerts → Create Alert Rule**
2. **Conditions**:
   - When: `Transaction duration (p95)`
   - Filter: `is above 3000ms for 10 minutes`
3. **Actions**:
   - ✅ Send email to tech lead

#### Alert Rule 3: Critical Errors
1. **Alerts → Create Alert Rule**
2. **Conditions**:
   - When: `The issue is first seen`
   - Filter: `level equals error AND transaction matches /(checkout|payment|signature)/`
3. **Actions**:
   - ✅ Send email immediately
   - ✅ Create PagerDuty incident (si configuré)

---

## 🧪 Tester l'Intégration

### Test 1: Erreur Runtime

Ajouter temporairement dans un composant:

```typescript
// Test Sentry - À SUPPRIMER après vérification
useEffect(() => {
  if (import.meta.env.PROD) {
    throw new Error('Sentry Test: This is a test error');
  }
}, []);
```

**Vérification**:
1. Déployer en production
2. Ouvrir la page
3. Aller dans Sentry → Issues
4. L'erreur doit apparaître en 1-2 minutes

### Test 2: Performance Trace

```typescript
import { trackEdgeFunctionCall } from '@/lib/sentryEdgeFunctions';

// Dans un composant
const handleAction = async () => {
  await trackEdgeFunctionCall(
    'test-function',
    { param: 'value' },
    () => supabase.functions.invoke('test-function')
  );
};
```

**Vérification**:
1. Exécuter l'action
2. Aller dans Sentry → Performance
3. Voir la trace `edge_function.test-function`

### Test 3: Session Replay

1. Naviguer dans l'app pendant 30 secondes
2. Provoquer une erreur (click sur bouton cassé)
3. Aller dans Sentry → Replays
4. Voir la vidéo de la session

---

## 📊 Dashboard Recommandé

### Widgets à Ajouter

1. **Error Rate Over Time**
   - Type: Line Chart
   - Metric: `count()`
   - Group By: `timestamp`

2. **Top 10 Errors**
   - Type: Table
   - Columns: `error.type`, `count()`, `last_seen`
   - Sort: `count() DESC`

3. **User Impact**
   - Type: Number
   - Metric: `count_unique(user)`
   - Filter: `event.type:error`

4. **Performance P95**
   - Type: Line Chart
   - Metric: `p95(transaction.duration)`
   - Group By: `transaction`

---

## 🔔 Notifications

### Slack Integration (Optionnel)

1. **Settings → Integrations → Slack**
2. **Connect Workspace**
3. **Configure**:
   - Channel: `#mon-toit-alerts`
   - Notifications: `All new issues` + `Resolved issues`

### Email Notifications

1. **User Settings → Notifications**
2. **Workflow Notifications**:
   - ✅ Issue Alerts
   - ✅ Deploy Notifications
   - ❌ Weekly Reports (trop verbeux)

---

## 📈 Métriques de Succès

Après 1 semaine en production:

| Métrique | Objectif |
|----------|----------|
| **Taux de capture** | > 95% |
| **Temps de détection** | < 5 min |
| **Résolution moyenne** | < 24h |
| **Session replays disponibles** | > 80% des erreurs |

---

## 🚨 Troubleshooting

### Problème: Sourcemaps non uploadés

**Symptômes**: Erreurs dans Sentry montrent du code minifié

**Solution**:
```bash
# Vérifier les variables d'environnement
echo $SENTRY_AUTH_TOKEN
echo $SENTRY_ORG
echo $SENTRY_PROJECT

# Build manuel pour debug
npm run build -- --debug
```

### Problème: Trop d'erreurs ResizeObserver

**Symptômes**: Dashboard pollué par erreurs bénignes

**Solution**: Déjà filtré dans `src/main.tsx`:
```typescript
ignoreErrors: [
  'ResizeObserver loop limit exceeded',
]
```

### Problème: Session replays vides

**Symptômes**: Replays disponibles mais vidéo noire

**Solution**:
```typescript
// src/main.tsx
replayIntegration({
  maskAllText: false, // ← Important pour voir le contenu
  blockAllMedia: false,
})
```

---

## 🔐 Sécurité & RGPD

### Données Sensibles

Par défaut, Sentry **masque**:
- ✅ Mots de passe (inputs type="password")
- ✅ Tokens dans headers
- ✅ Cookies de session

**Attention**: Les champs texte normaux sont capturés. Pour masquer:

```typescript
// Ajouter data-sentry-mask sur les champs sensibles
<input 
  type="text" 
  data-sentry-mask 
  placeholder="Email"
/>
```

### Retention des Données

1. **Settings → Data Management → Retention**
2. Configurer:
   - **Error events**: 30 jours
   - **Session replays**: 14 jours
   - **Performance data**: 30 jours

---

## 📞 Support

- **Documentation**: [docs.sentry.io](https://docs.sentry.io)
- **Status**: [status.sentry.io](https://status.sentry.io)
- **Community**: [forum.sentry.io](https://forum.sentry.io)

---

## ✅ Checklist de Mise en Production

- [ ] DSN configuré dans `.env.local`
- [ ] Auth token créé pour sourcemaps
- [ ] 3 alertes configurées (errors, performance, critical)
- [ ] Tests effectués (error, trace, replay)
- [ ] Dashboard personnalisé créé
- [ ] Notifications Slack/Email configurées
- [ ] Politique de rétention définie (RGPD)
- [ ] Équipe informée des procédures d'alerte
