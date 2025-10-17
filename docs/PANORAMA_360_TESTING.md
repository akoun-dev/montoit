# Plan de Tests - Visite Panoramique 360°

## 🎯 Objectif des Tests

Valider que la fonctionnalité de visite panoramique 360° fonctionne correctement sur tous les devices et navigateurs, et que l'expérience utilisateur est fluide et intuitive.

---

## ✅ Checklist de Tests

### 1. Tests de Compilation et Build

- [x] **Build production réussi** : `npm run build` sans erreurs
- [x] **Aucune erreur TypeScript** : Types correctement définis
- [x] **Dependencies installées** : @photo-sphere-viewer packages présents
- [x] **Bundle size acceptable** : +150 KB (277 KB gzippé pour common-vendor)
- [x] **CSS importés correctement** : Styles Photo Sphere Viewer chargés

**Status** : ✅ **VALIDÉ**

---

### 2. Tests Fonctionnels Desktop

#### Navigation Souris
- [ ] **Glisser pour explorer** : Le panorama tourne en glissant la souris
- [ ] **Zoom molette** : Le zoom fonctionne avec la molette
- [ ] **Double-clic** : Zoom rapide au double-clic
- [ ] **Fluidité** : 60 FPS maintenu pendant la navigation

#### Navigation Clavier
- [ ] **Flèches directionnelles** : ← → ↑ ↓ fonctionnent
- [ ] **Touches +/-** : Zoom in/out
- [ ] **Page Up/Down** : Zoom in/out alternatif

#### Contrôles UI
- [ ] **Bouton "Rotation auto"** : Active/désactive la rotation
- [ ] **Bouton Zoom +** : Zoom avant
- [ ] **Bouton Zoom -** : Zoom arrière
- [ ] **Bouton Plein écran** : Entre/sort du mode plein écran

#### Multi-Panoramas
- [ ] **Bouton "Précédent"** : Navigation vers panorama précédent
- [ ] **Bouton "Suivant"** : Navigation vers panorama suivant
- [ ] **Points de navigation** : Clic sur un point navigue vers le panorama
- [ ] **Désactivation intelligente** : Boutons désactivés aux extrémités
- [ ] **Compteur** : "1/3 - Salon" s'affiche correctement

#### États
- [ ] **Loading state** : Animation et message pendant le chargement
- [ ] **Instructions** : "🖱️ Glissez la souris pour explorer" visible
- [ ] **Badge titre** : Titre de la pièce affiché en haut à droite
- [ ] **Error state** : Message d'erreur si image invalide

**Navigateurs à tester** :
- [ ] Chrome (dernière version)
- [ ] Firefox (dernière version)
- [ ] Safari (dernière version)
- [ ] Edge (dernière version)

---

### 3. Tests Fonctionnels Mobile

#### Navigation Tactile
- [ ] **Glisser 1 doigt** : Rotation du panorama
- [ ] **Pinch 2 doigts** : Zoom in/out
- [ ] **Double tap** : Zoom rapide
- [ ] **Fluidité** : Navigation fluide sans lag

#### Gyroscope
- [ ] **Android - Auto** : Gyroscope activé automatiquement
- [ ] **iOS - Bouton** : Bouton "Activer le gyroscope" s'affiche
- [ ] **iOS - Permission** : Popup de permission apparaît
- [ ] **iOS - Accordée** : Gyroscope fonctionne après accord
- [ ] **iOS - Refusée** : Fallback vers contrôles tactiles
- [ ] **Désactivation** : Possibilité de désactiver le gyroscope

#### Multi-Panoramas Mobile
- [ ] **Boutons responsive** : Boutons adaptés au tactile (>44px)
- [ ] **Swipe** : Possibilité de swiper entre panoramas
- [ ] **Points navigation** : Points assez grands pour le tactile

#### États Mobile
- [ ] **Loading state** : Animation adaptée mobile
- [ ] **Instructions** : "👆 Glissez pour explorer" visible
- [ ] **Badge titre** : Lisible sur petit écran
- [ ] **Error state** : Message adapté mobile

**Devices à tester** :
- [ ] iPhone (iOS 13+)
- [ ] Android (dernières versions)
- [ ] Tablet iPad
- [ ] Tablet Android

**Navigateurs mobiles** :
- [ ] Safari iOS
- [ ] Chrome iOS
- [ ] Chrome Android
- [ ] Firefox Android

---

### 4. Tests d'Intégration

#### MediaGallery
- [ ] **Onglets** : "Vue 360°" apparaît si panoramas disponibles
- [ ] **Badge count** : Nombre de panoramas affiché (ex: "3")
- [ ] **Prefetch hover** : Images préchargées au survol de l'onglet
- [ ] **Switch onglets** : Changement fluide entre Photos/Vidéo/360°/Plans

#### Système de Restriction
- [ ] **Visiteur non connecté** : Onglet 360° caché
- [ ] **Utilisateur sans dossier** : Onglet 360° caché
- [ ] **Utilisateur validé** : Onglet 360° visible
- [ ] **Verification RLS** : Requête Supabase vérifie le statut

#### PropertyDetail
- [ ] **Chargement panoramas** : Données panoramic_images chargées depuis DB
- [ ] **Passage de props** : Props correctement passés à MediaGallery
- [ ] **SEO** : Métadonnées incluent mention de visite 360°

---

### 5. Tests de Performance

#### Temps de Chargement
- [ ] **Première visite** : < 3s sur 3G
- [ ] **Avec prefetch** : < 1s après hover sur onglet
- [ ] **Navigation panoramas** : < 500ms entre changements
- [ ] **Progressive loading** : Image basse résolution puis HD

#### Fluidité
- [ ] **FPS Desktop** : 60 FPS maintenu lors de la navigation
- [ ] **FPS Mobile** : 30+ FPS maintenu lors de la navigation
- [ ] **Memory usage** : < 150 MB de RAM
- [ ] **CPU usage** : Pas de throttling

#### Optimisations
- [ ] **Lazy loading** : Panoramas chargés uniquement si onglet ouvert
- [ ] **Code splitting** : Photo Sphere Viewer dans chunk séparé
- [ ] **Cache** : Images mises en cache par le navigateur
- [ ] **Compression** : Images compressées (WebP si supporté)

---

### 6. Tests des Edge Cases

#### Images Invalides
- [ ] **URL 404** : Message d'erreur clair
- [ ] **Ratio incorrect** : Charge quand même (déformation acceptable)
- [ ] **Taille énorme** : Loading state prolongé mais pas de crash
- [ ] **Format non supporté** : Message d'erreur explicite

#### Connectivité
- [ ] **Connexion lente** : Loading state approprié
- [ ] **Perte de connexion** : Message d'erreur réseau
- [ ] **Reconnexion** : Rechargement automatique possible

#### Navigation Rapide
- [ ] **Changement onglet rapide** : Pas de crash
- [ ] **Spam boutons navigation** : Pas de state incohérent
- [ ] **Double chargement** : Cache évite les doublons

#### Cas Limites
- [ ] **0 panorama** : Onglet caché
- [ ] **1 panorama** : Navigation désactivée
- [ ] **10+ panoramas** : Performance maintenue
- [ ] **Très haute résolution** : 8K supporté

---

### 7. Tests d'Accessibilité

#### Navigation Clavier
- [ ] **Tab navigation** : Tous les contrôles accessibles au clavier
- [ ] **Focus visible** : Outline visible sur focus
- [ ] **Escape** : Quitte le plein écran

#### Screen Readers
- [ ] **ARIA labels** : Labels corrects sur tous les boutons
- [ ] **Alt text** : Images ont des alt descriptifs
- [ ] **Live regions** : Changements annoncés (loading, erreurs)

#### Contraste
- [ ] **WCAG AA** : Ratio de contraste suffisant (4.5:1)
- [ ] **Boutons** : Visibles sur tous les backgrounds
- [ ] **Instructions** : Lisibles sur l'image panoramique

#### Taille des Cibles
- [ ] **Mobile** : Boutons > 44x44px
- [ ] **Desktop** : Boutons > 24x24px
- [ ] **Espacement** : 8px minimum entre éléments cliquables

---

### 8. Tests de Sécurité

#### Restrictions d'Accès
- [ ] **Non connecté** : Impossible d'accéder aux panoramas
- [ ] **Sans dossier** : Impossible d'accéder aux panoramas
- [ ] **Dossier non validé** : Impossible d'accéder aux panoramas
- [ ] **RLS Supabase** : Protection côté serveur effective

#### URLs et Injection
- [ ] **XSS** : Pas d'injection possible dans les titres
- [ ] **URL manipulation** : Pas d'accès en modifiant l'URL
- [ ] **CORS** : Uniquement images du domaine autorisé

---

### 9. Tests Multi-Navigateurs

#### Desktop
| Navigateur | Version | Navigation | Zoom | Plein écran | Clavier | Status |
|------------|---------|------------|------|-------------|---------|--------|
| Chrome     | Latest  | ⬜         | ⬜   | ⬜          | ⬜      | ⬜     |
| Firefox    | Latest  | ⬜         | ⬜   | ⬜          | ⬜      | ⬜     |
| Safari     | Latest  | ⬜         | ⬜   | ⬜          | ⬜      | ⬜     |
| Edge       | Latest  | ⬜         | ⬜   | ⬜          | ⬜      | ⬜     |

#### Mobile
| Device       | OS      | Navigation | Gyroscope | Zoom | Status |
|--------------|---------|------------|-----------|------|--------|
| iPhone 13    | iOS 17  | ⬜         | ⬜        | ⬜   | ⬜     |
| iPhone SE    | iOS 15  | ⬜         | ⬜        | ⬜   | ⬜     |
| Galaxy S21   | Android | ⬜         | ⬜        | ⬜   | ⬜     |
| Pixel 6      | Android | ⬜         | ⬜        | ⬜   | ⬜     |
| iPad Pro     | iOS 17  | ⬜         | ⬜        | ⬜   | ⬜     |

---

## 🧪 Procédure de Test Manuelle

### Test 1 : Navigation Desktop de Base

1. Ouvrir un bien avec panoramas dans Chrome
2. Cliquer sur l'onglet "Vue 360°"
3. Attendre le chargement (noter le temps)
4. Glisser la souris à gauche/droite
5. Glisser la souris en haut/bas
6. Utiliser la molette pour zoomer
7. Cliquer sur "Rotation auto"
8. Vérifier que ça tourne automatiquement
9. Cliquer sur plein écran
10. Appuyer sur Escape pour sortir

**Résultat attendu** : Navigation fluide, tous les contrôles fonctionnels

---

### Test 2 : Gyroscope Mobile iOS

1. Ouvrir un bien sur iPhone (Safari)
2. Taper sur l'onglet "Vue 360°"
3. Attendre le chargement
4. Vérifier que le bouton "Activer le gyroscope" s'affiche
5. Taper sur le bouton
6. Autoriser dans la popup iOS
7. Bouger le téléphone
8. Vérifier que la vue suit les mouvements

**Résultat attendu** : Permission demandée, gyroscope fonctionne

---

### Test 3 : Multi-Panoramas

1. Ouvrir un bien avec 3+ panoramas
2. Cliquer sur "Vue 360°"
3. Vérifier l'affichage "1/3 - Salon"
4. Cliquer sur "Suivant"
5. Vérifier l'affichage "2/3 - Chambre"
6. Cliquer sur les points de navigation
7. Vérifier que ça navigue correctement
8. Vérifier que "Précédent" est désactivé au début
9. Vérifier que "Suivant" est désactivé à la fin

**Résultat attendu** : Navigation fluide entre panoramas

---

### Test 4 : Prefetching

1. Ouvrir un bien avec panoramas (network tab ouvert)
2. Survoler l'onglet "Vue 360°" (ne pas cliquer)
3. Vérifier dans Network que les images se préchargent
4. Cliquer sur l'onglet "Vue 360°"
5. Vérifier que le chargement est instantané (cache)

**Résultat attendu** : Préchargement effectif, chargement rapide

---

### Test 5 : Restriction d'Accès

1. Déconnexion complète
2. Ouvrir un bien avec panoramas
3. Vérifier que l'onglet "Vue 360°" n'apparaît pas
4. Créer un compte (sans valider le dossier)
5. Rafraîchir la page
6. Vérifier que l'onglet "Vue 360°" n'apparaît toujours pas
7. Valider le dossier
8. Rafraîchir la page
9. Vérifier que l'onglet "Vue 360°" apparaît maintenant

**Résultat attendu** : Accès contrôlé selon le statut utilisateur

---

## 📊 Critères de Validation

### Must Have (Bloquants) ✅
- [x] Build production sans erreurs
- [ ] Navigation 360° fonctionnelle desktop
- [ ] Navigation 360° fonctionnelle mobile
- [ ] Multi-panoramas fonctionnel
- [ ] Restriction d'accès respectée
- [ ] Pas de crash sur erreur

### Should Have (Importants) 🔄
- [ ] Gyroscope iOS avec permissions
- [ ] Prefetching améliore les perfs
- [ ] 60 FPS maintenu sur desktop
- [ ] Loading states clairs
- [ ] Accessible au clavier

### Nice to Have (Bonus) 💫
- [ ] Rotation automatique fluide
- [ ] Hotspots fonctionnels
- [ ] Analytics tracking
- [ ] Support 8K
- [ ] Progressive loading

---

## 🐛 Rapport de Bugs

Si vous trouvez des bugs pendant les tests, utilisez ce template :

```markdown
### Bug #X : [Titre court]

**Priorité** : 🔴 Critique / 🟠 Haute / 🟡 Moyenne / 🟢 Basse

**Description** :
[Description détaillée du bug]

**Étapes de reproduction** :
1. [Étape 1]
2. [Étape 2]
3. [Résultat observé]

**Résultat attendu** :
[Ce qui devrait se passer]

**Environnement** :
- Device : [iPhone 13 / MacBook Pro / etc.]
- OS : [iOS 17 / macOS 14 / etc.]
- Navigateur : [Chrome 120 / Safari 17 / etc.]
- URL : [URL du bien testé]

**Screenshots/Vidéo** :
[Joindre si possible]

**Workaround** :
[Solution temporaire si existante]
```

---

## ✅ Validation Finale

Une fois tous les tests effectués :

- [ ] **Tests desktop** : ≥ 90% passés
- [ ] **Tests mobile** : ≥ 90% passés
- [ ] **Tests performance** : ≥ 80% passés
- [ ] **Tests accessibilité** : ≥ 80% passés
- [ ] **Tests sécurité** : 100% passés
- [ ] **Aucun bug critique** : 0 bugs 🔴
- [ ] **Bugs haute priorité résolus** : < 2 bugs 🟠
- [ ] **Documentation complète** : ✅

**Si tous les critères sont remplis** : ✅ **GO POUR LA PRODUCTION**

---

## 📝 Notes de Test

[Espace pour noter les observations pendant les tests]

---

**Document créé le** : 13 octobre 2025
**Dernière mise à jour** : 13 octobre 2025
**Testeurs assignés** : [À compléter]
**Date cible de validation** : [À définir]
