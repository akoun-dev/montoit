# Troubleshooting Edge Functions - Mon Toit

**Date :** 7 octobre 2025  
**Version :** 1.0.0

---

## 🚨 Erreur "Edge Function returned a non-2xx status code"

### Causes Possibles

#### 1. Service en Mode DEMO Non Configuré
**Symptôme :** Erreur 503 "Service temporairement indisponible"

**Cause :**
- Variable d'environnement `ONECI_DEMO_MODE` manquante ou `false`
- Clé API `ONECI_API_KEY` manquante

**Solution :**
1. Aller dans "View Backend" → Authentication → Settings
2. Ajouter une variable d'environnement :
   - **Nom** : `ONECI_DEMO_MODE`
   - **Valeur** : `true`
3. Redémarrer l'edge function (automatique)

**Note :** En mode DEMO, toutes les vérifications ONECI réussissent automatiquement. Ne pas utiliser avec de vraies données personnelles.

---

#### 2. Format CNI Invalide
**Symptôme :** Erreur 400 "Format CNI invalide"

**Format attendu :** `CI` + 10 chiffres (ex : `CI1234567890`)

**Solution :**
- Vérifier que le numéro CNI commence par "CI" (majuscules)
- Vérifier qu'il contient exactement 10 chiffres après "CI"
- Exemple valide : `CI0123456789`
- Exemple invalide : `ci123` (trop court), `CI12345` (trop court), `1234567890` (pas de préfixe)

---

#### 3. Session Expirée
**Symptôme :** Erreur 401 "Session expirée"

**Cause :** Token d'authentification expiré

**Solution :**
1. Se déconnecter
2. Se reconnecter
3. Réessayer la vérification

---

#### 4. Erreur Technique Serveur
**Symptôme :** Erreur 500 "Une erreur est survenue"

**Causes possibles :**
- Problème de connexion à la base de données
- Erreur dans le code de l'edge function
- Données corrompues

**Solution :**
1. Consulter les logs de l'edge function via "View Backend"
2. Vérifier que la table `user_verifications` existe
3. Contacter le support si le problème persiste

---

## 📊 Messages Utilisateur par Code HTTP

| Code HTTP | Message Affiché | Action Utilisateur |
|-----------|-----------------|-------------------|
| **400** | "Format CNI incorrect" | Corriger le numéro CNI (CI + 10 chiffres) |
| **401** | "Session expirée" | Se reconnecter |
| **503** | "Service temporairement indisponible" | Réessayer plus tard ou activer mode DEMO |
| **500** | "Erreur technique" | Contacter le support |

---

## 🔍 Debugging pour Développeurs

### 1. Consulter les Logs Edge Function

**Via Lovable Cloud :**
1. Cliquer sur "View Backend" en haut à droite
2. Aller dans "Edge Functions" → "oneci-verification"
3. Filtrer par "Error" ou rechercher par date

**Logs utiles :**
```
[DEMO MODE] ONECI verification - Auto-approving
[PRODUCTION] Calling real ONECI API
Error in oneci-verification: ...
```

---

### 2. Tester avec des Données Valides

**CNI de test (mode DEMO) :**
- Format : `CI1234567890`
- Nom : `KOUASSI`
- Prénom : `Kouadio Jean`
- Date de naissance : `1990-01-15` (format YYYY-MM-DD)

**Attendu :**
- Statut : `pending_review`
- Message : "Vérification envoyée. En attente de validation par un administrateur sous 48h."

---

### 3. Vérifier Variables d'Environnement

**Via SQL Editor (Lovable Cloud) :**
```sql
-- Vérifier si ONECI_DEMO_MODE est configuré
-- Note: Les variables d'env ne sont PAS stockées dans vault.secrets
-- Vérifier via Backend → Settings → Environment Variables
```

**Via Console Browser (Network Tab) :**
1. Ouvrir DevTools (F12)
2. Aller dans "Network"
3. Soumettre le formulaire ONECI
4. Cliquer sur la requête `oneci-verification`
5. Regarder l'onglet "Response" pour voir le code d'erreur exact

---

## 🛡️ Mode DEMO vs. Production

### Mode DEMO (`ONECI_DEMO_MODE=true`)
- ✅ Toutes les vérifications ONECI réussissent
- ⚠️ Données fictives générées automatiquement
- 📊 Flag `isDemoMode: true` dans la réponse JSON
- 🚫 **NE PAS utiliser en production** avec de vraies données personnelles

### Mode Production (`ONECI_API_KEY` configuré)
- ✅ Appels API ONECI réels
- ✅ Validation des données gouvernementales
- ⏱️ Délai de réponse : 2-5 secondes
- 🔐 Nécessite une clé API valide fournie par l'ONECI

---

## ⚙️ Configuration Recommandée

### Environnement de Développement/Test
```bash
ONECI_DEMO_MODE=true
ONECI_API_KEY= (vide)
```

### Environnement de Production
```bash
ONECI_DEMO_MODE=false
ONECI_API_KEY=<clé_fournie_par_ONECI>
```

---

## 🆘 Support

Si le problème persiste après avoir suivi ces étapes :
1. Copier le message d'erreur exact
2. Noter l'heure de l'erreur (pour recherche dans les logs)
3. Contacter le support via [support@mon-toit.ci](mailto:support@mon-toit.ci)

---

**Dernière mise à jour :** 7 octobre 2025  
**Maintenu par :** Équipe Technique Mon Toit
