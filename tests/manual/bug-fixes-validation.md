# Tests de Validation - Corrections Bugs Utilisateurs

**Date :** 7 octobre 2025  
**Version :** 1.0.0  
**Bugs Corrigés :** #4, #8, #9, #16

---

## 🎯 Objectif

Valider que les corrections apportées aux bugs signalés par les utilisateurs fonctionnent correctement et n'introduisent pas de régressions.

---

## Test 1 : ONECI Validation (Bug #16)

### Scénario 1.1 : Format CNI invalide (Frontend)
**Objectif :** Vérifier que la validation frontend bloque les formats incorrects

**Étapes :**
1. Aller sur `/verification`
2. Onglet "ONECI"
3. Remplir le formulaire :
   - CNI : `123456789` (sans "CI")
   - Nom : `KOUASSI`
   - Prénom : `Jean`
   - Date naissance : `1990-01-15`
4. Cliquer "Vérifier mon identité"

**Résultat attendu :**
- [ ] ❌ Toast d'erreur affiché : "Format CNI invalide"
- [ ] ❌ Aucun appel à l'edge function (vérifier Network tab)
- [ ] ✅ Le formulaire reste affiché (pas de navigation)

**Statut :** ⏳ Non testé

---

### Scénario 1.2 : Mode DEMO actif
**Objectif :** Vérifier que le mode DEMO valide automatiquement

**Prérequis :** Variable `ONECI_DEMO_MODE=true` configurée

**Étapes :**
1. Aller sur `/verification`
2. Onglet "ONECI"
3. Remplir le formulaire :
   - CNI : `CI1234567890`
   - Nom : `KOUASSI`
   - Prénom : `Jean`
   - Date naissance : `1990-01-15`
4. Cliquer "Vérifier mon identité"
5. Attendre la réponse (2-3 secondes)

**Résultat attendu :**
- [ ] ✅ Toast de succès : "Vérification envoyée. En attente de validation par un administrateur sous 48h."
- [ ] ✅ Statut `oneci_status` dans `user_verifications` = `pending_review`
- [ ] ❌ `profiles.oneci_verified` reste `false` (pas de mise à jour automatique)
- [ ] ✅ FaceVerification s'affiche après

**Statut :** ⏳ Non testé

---

### Scénario 1.3 : Service indisponible (Ni DEMO ni API)
**Objectif :** Vérifier le message d'erreur quand aucun service n'est configuré

**Prérequis :** 
- `ONECI_DEMO_MODE=false` ou absent
- `ONECI_API_KEY` absent

**Étapes :**
1. Aller sur `/verification`
2. Onglet "ONECI"
3. Remplir le formulaire avec des données valides
4. Cliquer "Vérifier mon identité"

**Résultat attendu :**
- [ ] ❌ Toast d'erreur : "Service temporairement indisponible"
- [ ] ❌ Sous-titre : "La vérification ONECI est en maintenance. Réessayez dans quelques minutes."
- [ ] 🔍 Status HTTP = 503 (vérifier Network tab)

**Statut :** ⏳ Non testé

---

## Test 2 : PropertyDetail Loading (Bug #4)

### Scénario 2.1 : UUID invalide
**Objectif :** Vérifier qu'un UUID malformé n'affiche pas de toast d'erreur

**Étapes :**
1. Aller sur `/property/invalid-uuid-123`

**Résultat attendu :**
- [ ] ✅ Page "Ce bien n'existe plus ou a été retiré" affichée
- [ ] ❌ **AUCUN toast d'erreur** affiché
- [ ] ✅ Bouton "Retour à la recherche" présent

**Statut :** ⏳ Non testé

---

### Scénario 2.2 : Bien supprimé/inexistant
**Objectif :** Vérifier qu'un bien inexistant n'affiche pas de toast d'erreur

**Étapes :**
1. Copier l'UUID d'un bien existant depuis la base de données
2. Supprimer ce bien via SQL Editor :
   ```sql
   DELETE FROM properties WHERE id = 'xxx-xxx-xxx';
   ```
3. Aller sur `/property/xxx-xxx-xxx`

**Résultat attendu :**
- [ ] ✅ Page "Ce bien n'existe plus ou a été retiré" affichée
- [ ] ❌ **AUCUN toast d'erreur** affiché
- [ ] 📝 Message : "Il a peut-être été loué ou supprimé par le propriétaire."

**Statut :** ⏳ Non testé

---

### Scénario 2.3 : Erreur RLS/Technique
**Objectif :** Vérifier qu'une vraie erreur technique affiche un toast

**Étapes :**
1. Désactiver temporairement la policy RLS sur `properties` :
   ```sql
   DROP POLICY "Properties are viewable by everyone" ON properties;
   ```
2. Aller sur un property_id valide
3. Observer l'erreur
4. Restaurer la policy :
   ```sql
   CREATE POLICY "Properties are viewable by everyone"
   ON properties FOR SELECT
   USING (true);
   ```

**Résultat attendu :**
- [ ] ❌ Toast d'erreur affiché : "Erreur technique. Impossible de charger les détails du bien."
- [ ] 🔍 Console : Erreur RLS loggée
- [ ] ✅ Page "Bien introuvable" affichée après

**Statut :** ⏳ Non testé

---

## Test 3 : Messages Loading Infini (Bug #8)

### Scénario 3.1 : Aucune conversation
**Objectif :** Vérifier que "Aucune conversation" s'affiche rapidement

**Étapes :**
1. Créer un nouveau compte locataire
2. Se connecter
3. Aller sur `/messages`
4. Démarrer un chronomètre

**Résultat attendu :**
- [ ] ✅ Loading s'arrête en **< 5 secondes**
- [ ] ✅ Message "Aucune conversation" affiché
- [ ] ❌ **AUCUN** loading infini

**Statut :** ⏳ Non testé

---

### Scénario 3.2 : Profil manquant
**Objectif :** Vérifier le fallback "Utilisateur inconnu"

**Étapes :**
1. Avoir une conversation existante avec un utilisateur
2. Via SQL Editor, supprimer le profil de l'autre utilisateur :
   ```sql
   DELETE FROM profiles WHERE id = 'xxx-xxx-xxx';
   ```
3. Aller sur `/messages`
4. Sélectionner la conversation

**Résultat attendu :**
- [ ] ✅ Liste de conversations affiche "Utilisateur inconnu"
- [ ] ✅ En-tête de conversation affiche "Utilisateur inconnu"
- [ ] ❌ **AUCUN crash** ou erreur console

**Statut :** ⏳ Non testé

---

### Scénario 3.3 : Timeout de sécurité (Réseau lent)
**Objectif :** Vérifier que le timeout de 10s fonctionne

**Étapes :**
1. Ouvrir DevTools (F12)
2. Onglet "Network" → "Throttling" → Sélectionner "Slow 3G"
3. Aller sur `/messages`
4. Attendre 10 secondes

**Résultat attendu :**
- [ ] ✅ Après 10 secondes : Toast "Chargement lent" affiché
- [ ] ✅ Loading s'arrête automatiquement
- [ ] ✅ Interface reste utilisable

**Statut :** ⏳ Non testé

---

## Test 4 : Studio Caractéristiques (Bug #9)

### Scénario 4.1 : Affichage "Studio"
**Objectif :** Vérifier que "Studio (0 chambre séparée)" s'affiche

**Étapes :**
1. Créer un bien avec `bedrooms = 0`
2. Aller sur la page de détail du bien

**Résultat attendu :**
- [ ] ✅ Section "Chambres" affiche : **"Studio (0 chambre séparée)"**
- [ ] ❌ **PAS** juste "0"

**Statut :** ⏳ Non testé

---

### Scénario 4.2 : Badge "Loué" avec Icône
**Objectif :** Vérifier que le badge "Loué" a une icône cadenas

**Étapes :**
1. Marquer un bien comme "loué" via SQL :
   ```sql
   UPDATE properties SET status = 'loué' WHERE id = 'xxx-xxx-xxx';
   ```
2. Aller sur la page de recherche ou mes propriétés
3. Regarder la PropertyCard

**Résultat attendu :**
- [ ] ✅ Badge gris affiché : "Loué"
- [ ] ✅ Icône cadenas 🔒 visible avant le texte
- [ ] ✅ Badge bien visible (top-left sous le badge temps)

**Statut :** ⏳ Non testé

---

## 📊 Résumé des Validations

| Bug # | Titre | Scénarios | Tests Passés | Statut |
|-------|-------|-----------|--------------|--------|
| **#16** | ONECI Edge Function | 3 | 0/3 | ⏳ En attente |
| **#4** | PropertyDetail Loading | 3 | 0/3 | ⏳ En attente |
| **#8** | Messages Loading Infini | 3 | 0/3 | ⏳ En attente |
| **#9** | Studio Caractéristiques | 2 | 0/2 | ⏳ En attente |

**Total :** 11 scénarios de test

**Légende :**
- ⏳ En attente de test
- ✅ Test passé
- ❌ Test échoué
- 🔄 À retester

---

## 🛠️ Procédure de Test

### Avant de commencer
1. [ ] Vérifier que `ONECI_DEMO_MODE=true` est configuré
2. [ ] Créer 2 comptes de test (locataire + propriétaire)
3. [ ] Créer 1-2 biens de test (dont 1 studio avec `bedrooms=0`)

### Ordre recommandé
1. **Phase 1 :** Tests critiques (#16, #4, #8)
2. **Phase 2 :** Tests UX (#9)
3. **Phase 3 :** Tests de régression (rejouer tous les scénarios)

### Après les tests
1. [ ] Documenter les bugs trouvés dans ce fichier
2. [ ] Créer des issues GitHub pour les régressions
3. [ ] Mettre à jour le statut dans `PRODUCTION_READINESS_CHECKLIST.md`

---

**Dernière mise à jour :** 7 octobre 2025  
**Testeur :** [À compléter]
