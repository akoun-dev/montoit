# Améliorations de Sécurité - Plateforme Mon Toit

## Vue d'ensemble

Ce document décrit les améliorations critiques de sécurité implémentées pour protéger la plateforme Mon Toit contre les vulnérabilités web courantes et les attaques malveillantes.

## 🛡️ Protections Implémentées

### 1. Protection XSS (Cross-Site Scripting)

**Fichiers implémentés :**
- `src/lib/sanitize.ts` - Utilitaire principal de sanitization
- Composants mis à jour : `PropertyDetail.tsx`, `Messages.tsx`, `chart.tsx`

**Fonctionnalités :**
- **DOMPurify intégré** : Nettoyage complet du contenu HTML utilisateur
- **Configurations spécialisées** : Différentes règles selon le type de contenu
  - `PROPERTY_DESCRIPTION_CONFIG` : Pour descriptions de biens
  - `MESSAGE_CONFIG` : Pour messages utilisateurs (restrictif)
  - `ADMIN_CONTENT_CONFIG` : Pour contenu admin (plus permissif)
- **Détection de contenu suspect** : Identification des tentatives d'injection
- **Hooks React** : `useSanitizedContent` pour intégration facile

**Exemple d'utilisation :**
```tsx
<div
  dangerouslySetInnerHTML={{
    __html: sanitizePropertyDescription(property.description)
  }}
/>
```

### 2. Content Security Policy (CSP)

**Fichiers configurés :**
- `public/_headers` - Configuration Vercel
- `vercel.json` - En-têtes de sécurité détaillés

**Règles CSP implémentées :**
- **default-src 'self'** : Autorise seulement les ressources du même domaine
- **script-src** : Contrôle strict des scripts avec domaines whitelistés
- **style-src** : Permet les styles inline nécessaires pour Mapbox
- **img-src** : Autorise les images de domaines fiables uniquement
- **connect-src** : Contrôle les connexions API (Supabase, Mapbox, Sentry)
- **object-src 'none'** : Bloque les plugins potentiellement dangereux
- **frame-ancestors 'none'** : Prévient le clickjacking

### 3. Error Boundary Robuste

**Fichier :** `src/components/ui/error-boundary.tsx`

**Fonctionnalités avancées :**
- **Capture d'erreurs complète** : React + erreurs asynchrones
- **Intégration Sentry** : Reporting automatique avec contexte enrichi
- **Mécanisme de retry** : Tentatives progressives avec délai exponentiel
- **UI de récupération** : Interface conviviale en cas d'erreur
- **Mode debug** : Informations techniques en développement
- **Logging sécurisé** : Stockage local des erreurs pour débogage

**Exemple d'intégration :**
```tsx
<ErrorBoundary level="error">
  <App />
</ErrorBoundary>
```

### 4. Validation de Formulaires Renforcée

**Fichier :** `src/lib/validation-schemas.ts`

**Schémas de validation sécurisés :**
- **userSchemas** : Inscription, connexion, profil
- **propertySchemas** : Création/modification de biens
- **messageSchemas** : Messagerie et pièces jointes
- **applicationSchemas** : Candidatures locatives
- **adminSchemas** : Actions administratives
- **supportSchemas** : Tickets de support

**Protections intégrées :**
- **Détection de patterns suspects** : Scripts, injections SQL
- **Validation de format** : Email, téléphone, URLs
- **Limites de taille** : Protection contre les attaques par volume
- **Nettoyage automatique** : trim() et échappement des caractères

### 5. Monitoring Sentry Amélioré

**Fichier :** `src/lib/sentry-enhanced.ts`

**Fonctionnalités :**
- **Configuration multi-environnement** : Dev/Prod séparés
- **Filtrage de données sensibles** : Protection vie privée
- **Tags de sécurité** : Classification des menaces
- **Performance tracking** : Monitoring des temps de réponse
- **Contexte utilisateur** : Informations de session enrichies

**Exemples d'utilisation :**
```tsx
import { captureSecurityError, trackNetworkError } from '@/lib/sentry-enhanced';

// Capture d'erreur de sécurité
captureSecurityError(error, {
  attackType: 'xss_attempt',
  source: 'user_input',
  severity: 'high'
});

// Tracking d'erreur réseau
trackNetworkError(error, {
  url: request.url,
  method: request.method,
  responseTime: 1500
});
```

### 6. Middleware de Sécurité

**Fichier :** `src/lib/security-middleware.ts`

**Protections implémentées :**
- **Rate limiting** : Protection contre les abus
- **Détection de brute force** : Limitation des tentatives
- **Validation CSRF** : Tokens anti-CSRF pour les formulaires
- **Surveillance d'événements** : Détection de comportements suspects
- **Autorisation basée sur les rôles** : Vérification des permissions
- **Audit trail** : Journalisation des événements de sécurité

**Hook React disponible :**
```tsx
const security = useSecurity();

// Validation d'entrée utilisateur
const validation = security.validateInput(userInput, 'contact_form');

// Vérification d'autorisation
const isAuthorized = security.checkAuthorization(userRole, 'admin', 'delete_property');
```

## 🔧 Configuration et Déploiement

### Variables d'Environnement Requises

```bash
# Sentry (pour le monitoring de production)
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
VITE_APP_VERSION=1.0.0

# Configuration de sécurité
VITE_MAX_LOGIN_ATTEMPTS=5
VITE_RATE_LIMIT_WINDOW=900000  # 15 minutes en ms
```

### Dépendances Ajoutées

```bash
npm install dompurify @types/dompurify
npm install zod  # si non déjà installé
```

## 📊 Monitoring et Alertes

### Métriques de Sécurité Suivies

1. **Tentatives XSS bloquées**
2. **Événements de rate limiting**
3. **Erreurs d'autorisation**
4. **Tentatives de brute force**
5. **Anomalies dans les formulaires**

### Tableaux de Bord Sentry

- **Vue d'ensemble des erreurs** : Classification par type
- **Performance** : Temps de réponse des APIs
- **Sécurité** : Événements de sécurité groupés
- **Utilisateurs** : Impact par segment utilisateur

## 🚀 Bonnes Pratiques

### Pour les Développeurs

1. **Toujours utiliser les fonctions de sanitization** pour le contenu utilisateur
2. **Valider les entrées** avec les schémas Zod fournis
3. **Utiliser l'ErrorBoundary** pour les composants critiques
4. **Reporter les erreurs** avec contexte enrichi
5. **Vérifier les permissions** avant les actions sensibles

### Pour les Administrateurs

1. **Surveiller le tableau de bord Sentry** régulièrement
2. **Revoir les événements de sécurité** dans les logs
3. **Mettre à jour les règles CSP** selon les besoins
4. **Former les utilisateurs** aux bonnes pratiques de sécurité

## 🔄 Maintenance Continue

### Tâches Mensuelles

- [ ] Vérifier les logs de sécurité
- [ ] Mettre à jour les dépendances
- [ ] Revoir les règles CSP
- [ ] Analyser les tendances d'attaques

### Tâches Trimestrielles

- [ ] Audit de sécurité complet
- [ ] Tests de pénétration
- [ ] Mise à jour des configurations
- [ ] Formation équipe sécurité

## 🚨 En Cas d'Incident

### Procédures d'Urgence

1. **Isoler le système** si attaque en cours
2. **Activer le mode maintenance**
3. **Analyser les logs** avec l'équipe de sécurité
4. **Appliquer les correctifs** nécessaires
5. **Communiquer** aux utilisateurs impactés

### Contacts de Sécurité

- **Équipe technique** : tech@mon-toit.ci
- **Urgence sécurité** : security@mon-toit.ci
- **Sentry Dashboard** : https://sentry.io/mon-toit

---

**Dernière mise à jour :** 16 Octobre 2024
**Version :** 1.0.0
**Responsable :** Équipe de Sécurité Mon Toit