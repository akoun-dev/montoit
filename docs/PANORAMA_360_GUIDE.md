# Guide d'Utilisation - Visite Panoramique 360°

## 🎯 Vue d'Ensemble

La fonctionnalité de visite panoramique 360° permet aux utilisateurs avec dossier validé d'explorer les biens immobiliers de manière interactive et immersive.

## ✨ Fonctionnalités Implémentées

### 1. Viewer 360° Interactif
- **Navigation à la souris** : Glissez pour explorer
- **Zoom** : Molette de souris ou boutons +/-
- **Navigation au clavier** : Flèches directionnelles
- **Mode plein écran** : Bouton dans la barre de navigation
- **Rotation automatique** : Activation/désactivation via bouton

### 2. Support Mobile avec Gyroscope
- **Détection automatique** : Le gyroscope est activé sur les appareils compatibles
- **Permissions iOS** : Bouton "Activer le gyroscope" pour iOS 13+
- **Fallback tactile** : Navigation tactile si gyroscope non disponible
- **Instructions contextuelles** : "👆 Glissez pour explorer" sur mobile

### 3. Navigation Multi-Panoramas
- **Navigation séquentielle** : Boutons Précédent/Suivant
- **Indicateurs visuels** : Points de navigation interactifs
- **Compteur** : "1/3 - Salon" affiche la position actuelle
- **Transitions fluides** : Changement instantané entre panoramas

### 4. Prefetching Intelligent
- **Chargement anticipé** : Au survol de l'onglet "Vue 360°"
- **Priorité basse** : N'impacte pas le chargement des autres ressources
- **Cache navigateur** : Évite les rechargements inutiles

### 5. États et Feedback Utilisateur
- **Loading state** : Indicateur de chargement avec animation
- **Error handling** : Messages d'erreur clairs si échec
- **Instructions** : "🖱️ Glissez la souris pour explorer" sur desktop
- **Badge titre** : Affiche le nom de la pièce en cours

## 📋 Prérequis

### Pour Voir les Visites 360°
1. ✅ Compte créé sur Mon Toit
2. ✅ Dossier locataire validé (identité, revenus, etc.)
3. ✅ Le bien doit avoir des images panoramiques uploadées

### Format des Images 360°
- **Ratio requis** : 2:1 (ex: 4096x2048px)
- **Formats acceptés** : JPEG, PNG
- **Taille recommandée** : 4096x2048px minimum
- **Poids max** : Optimiser pour ~2-5 MB par image

## 🎬 Utilisation

### Pour les Utilisateurs

#### Desktop
1. Accédez à la page d'un bien
2. Cliquez sur l'onglet "Vue 360°"
3. Attendez le chargement (quelques secondes)
4. Glissez la souris pour explorer
5. Utilisez la molette pour zoomer
6. Cliquez sur "Rotation auto" pour activer la rotation
7. Utilisez les flèches du clavier pour naviguer
8. Cliquez sur l'icône plein écran en bas à droite

#### Mobile
1. Accédez à la page d'un bien
2. Tapez sur l'onglet "Vue 360°"
3. Si demandé, tapez sur "Activer le gyroscope"
4. Bougez votre téléphone pour explorer
5. Pincez pour zoomer
6. Glissez pour naviguer manuellement
7. Utilisez les boutons Précédent/Suivant pour changer de pièce

### Pour les Propriétaires/Agents

#### Créer une Image 360°
**Avec un smartphone :**
- Utilisez Google Street View App (Android/iOS)
- Prenez une photo sphérique
- Exportez en haute résolution

**Avec une caméra 360° :**
- Ricoh Theta, Insta360, GoPro MAX
- Exportez en format equirectangular
- Ratio 2:1 obligatoire

#### Uploader les Images 360°
1. Connectez-vous à Mon Toit
2. Allez dans "Mes Biens"
3. Éditez le bien concerné
4. Section "Médias" > "Images panoramiques"
5. Uploadez vos photos 360°
6. Ajoutez un titre pour chaque vue (ex: "Salon", "Chambre")
7. Sauvegardez

**Ordre recommandé :**
1. Entrée
2. Salon/Séjour
3. Cuisine
4. Chambres
5. Salles de bain
6. Extérieurs

## 🔧 Fonctionnalités Techniques

### Architecture
```typescript
// PanoramaViewer
- Utilise @photo-sphere-viewer/core (library moderne)
- Plugin Gyroscope pour mobile
- Plugin Markers pour les hotspots
- Gestion du fullscreen natif

// MediaGallery
- Intégration avec système de restriction d'accès
- Prefetching au hover
- Navigation entre panoramas
- Support multi-vues

// usePanoramaPrefetch
- Hook personnalisé pour le prefetching
- Priorité configurable
- Cache des URLs déjà chargées
```

### Contrôles Disponibles

**Souris (Desktop) :**
- Glisser : Rotation du panorama
- Molette : Zoom in/out
- Double-clic : Zoom rapide

**Clavier :**
- ← → : Rotation horizontale
- ↑ ↓ : Rotation verticale
- + - : Zoom in/out
- Page Up/Down : Zoom in/out

**Tactile (Mobile) :**
- 1 doigt : Rotation
- 2 doigts (pinch) : Zoom
- Gyroscope : Rotation automatique

**Boutons UI :**
- Rotation auto : Toggle rotation automatique
- Zoom : Zoom in/out
- Fullscreen : Mode plein écran
- Activer gyroscope : Demande permissions iOS

## 📊 Métriques à Tracker (À Implémenter)

### Événements
- `panorama_view_start` : Ouverture du viewer
- `panorama_view_complete` : Vue complète (>30s)
- `panorama_navigation` : Changement de pièce
- `gyroscope_enabled` : Activation gyroscope
- `panorama_fullscreen` : Mode plein écran activé

### KPIs
- Taux d'engagement 360° : % utilisateurs qui ouvrent l'onglet
- Temps moyen de visite : Durée moyenne en mode 360°
- Taux de complétion : % qui voient toutes les pièces
- Impact conversion : Taux de candidature après visite 360°

## 🐛 Troubleshooting

### L'image ne charge pas
**Causes possibles :**
- URL invalide ou image supprimée
- Format d'image incorrect (ratio ≠ 2:1)
- Problème de connexion internet
- CORS non configuré sur le serveur

**Solutions :**
1. Vérifier l'URL dans la console
2. Vérifier le ratio de l'image (doit être 2:1)
3. Vérifier les headers CORS
4. Réuploader l'image

### Le gyroscope ne fonctionne pas
**Sur iOS :**
- Tapez sur "Activer le gyroscope"
- Autorisez l'accès dans la popup
- Si refusé : Réglages > Safari > Mouvement et orientation

**Sur Android :**
- Devrait fonctionner automatiquement
- Vérifiez les permissions de l'app
- Certains navigateurs ne le supportent pas (utilisez Chrome)

### La rotation est saccadée
**Causes :**
- Image trop lourde (>10 MB)
- Trop d'onglets ouverts
- Device peu puissant

**Solutions :**
- Compresser les images (2-5 MB recommandé)
- Fermer les onglets inutiles
- Réduire la résolution des images

### Mode plein écran ne fonctionne pas
**Causes :**
- Certains navigateurs bloquent le fullscreen
- Popup bloquée
- iOS ne supporte pas le vrai fullscreen

**Solutions :**
- Utiliser Chrome/Firefox sur desktop
- Sur iOS, le viewer prend déjà tout l'écran disponible
- Autoriser les popups pour ce site

## 🚀 Améliorations Futures

### Court Terme
- [ ] Analytics et tracking des événements
- [ ] Hotspots de navigation entre pièces
- [ ] Support des vidéos 360°
- [ ] Mini-map pour se repérer

### Moyen Terme
- [ ] Téléchargement des panoramas (watermarked)
- [ ] Mode visite guidée avec audio
- [ ] Annotations interactives sur les panoramas
- [ ] Partage de liens directs vers une pièce spécifique

### Long Terme
- [ ] Support VR (WebXR)
- [ ] Visite en direct avec agent (WebRTC)
- [ ] IA pour descriptions automatiques
- [ ] Intégration Matterport native

## 📚 Ressources

### Pour Créer des Images 360°
- **Google Street View App** : Gratuit, facile à utiliser
- **Ricoh Theta** : Caméra 360° abordable (~300€)
- **Insta360** : Caméras professionnelles (500-1000€)
- **Kuula.co** : Service en ligne pour héberger et éditer

### Documentation Technique
- Photo Sphere Viewer : https://photo-sphere-viewer.js.org/
- Gyroscope API : https://developer.mozilla.org/en-US/docs/Web/API/Gyroscope
- WebXR : https://immersiveweb.dev/

### Tutoriels
- Comment créer une photo 360° : https://www.youtube.com/watch?v=...
- Éditer des images panoramiques : https://...
- Bonnes pratiques de capture : https://...

## 🎖️ Conclusion

La fonctionnalité de visite panoramique 360° est maintenant **pleinement fonctionnelle** !

Les utilisateurs avec dossier validé peuvent :
- ✅ Explorer les biens en 360° interactif
- ✅ Naviguer entre plusieurs pièces
- ✅ Utiliser le gyroscope sur mobile
- ✅ Zoomer et naviguer de manière fluide
- ✅ Profiter d'un chargement optimisé avec prefetching

Cette fonctionnalité positionne Mon Toit comme une plateforme innovante et moderne sur le marché immobilier ivoirien.

---

**Version** : 1.0.0
**Date** : 13 octobre 2025
**Auteur** : Équipe Mon Toit
**Status** : ✅ Production Ready
