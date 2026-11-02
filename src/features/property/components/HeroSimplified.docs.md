# HeroSimplified - Documentation

## Vue d'ensemble

Le composant `HeroSimplified` est une section d'en-tête moderne et performante pour la recherche de propriétés immobilières. Il remplace les versions précédentes avec carousel en offrant une approche simple et efficace.

## Caractéristiques principales

### ✨ Design moderne

- **Image statique** haute qualité (pas de carousel)
- **Titre 64px bold** et **sous-titre 18px**
- **Overlay noir 50%** pour une lisibilité optimale
- **Hauteur responsive** : 500px desktop / 400px mobile

### 🔍 Formulaire de recherche intégré

- Recherche par ville/quartier
- Sélection du type de propriété
- Saisie du budget maximum
- Validation automatique des champs

### ♿ Accessibilité

- Balises ARIA complètes
- Navigation au clavier
- Contraste élevé
- Labels descriptifs

### ⚡ Performance

- Image avec loading optimisé
- CSS minimal
- Pas d'animations complexes
- Re-rendu React optimisé

## Utilisation de base

```tsx
import { HeroSimplified } from '@/features/property';

function HomePage() {
  const handleSearch = (filters: SearchFilters) => {
    console.log('Recherche:', filters);
    // Redirection ou logique de recherche
  };

  return (
    <div>
      <HeroSimplified onSearch={handleSearch} />
      {/* Autres sections */}
    </div>
  );
}
```

## Props disponibles

### `onSearch` (obligatoire)

Fonction appelée lors de la soumission du formulaire.

**Type :** `(filters: SearchFilters) => void`

**SearchFilters :**

```ts
interface SearchFilters {
  city: string; // Ville ou quartier sélectionné
  propertyType: string; // Type de propriété (appartement, villa, etc.)
  maxBudget: string; // Budget maximum en FCFA
}
```

### `title` (optionnel)

Titre principal affiché.

**Type :** `string`  
**Défaut :** "Trouvez votre logement idéal"

### `subtitle` (optionnel)

Sous-titre affiché sous le titre.

**Type :** `string`  
**Défaut :** "Des milliers de propriétés vous attendent dans toute la Côte d'Ivoire"

### `backgroundImage` (optionnel)

URL de l'image de fond.

**Type :** `string`  
**Défaut :** "/images/hero-residence-moderne.jpg"

## Design Tokens utilisés

Le composant utilise le système de design tokens :

- **Couleurs :** `--color-primary-500` (orange principal)
- **Typographie :** `--font-size-hero-title` (64px) et `--font-size-hero-subtitle` (18px)
- **Espacement :** Système 4pt grid
- **Border radius :** `--border-radius-xl` (12px)
- **Animations :** `--animation-duration-base` (250ms)

## Responsive

### Desktop (≥768px)

- Hauteur : 500px
- Formulaire sur 4 colonnes
- Espacement optimisé
- Boutons adaptés

### Mobile (<768px)

- Hauteur : 400px
- Formulaire empilé
- Padding réduit
- Focus sur la facilité d'utilisation

## Exemples d'utilisation

### 1. Page d'accueil personnalisée

```tsx
<HeroSimplified
  onSearch={handleSearch}
  title="Découvrez votre nouvelle maison"
  subtitle="Plus de 10 000 annonces vérifiées en Côte d'Ivoire"
  backgroundImage="/images/hero-villa-cocody.jpg"
/>
```

### 2. Page de recherche avec filtres spécifiques

```tsx
<HeroSimplified
  onSearch={(filters) => {
    const params = new URLSearchParams();
    if (filters.city) params.set('city', filters.city);
    if (filters.propertyType) params.set('type', filters.propertyType);
    if (filters.maxBudget) params.set('max_price', filters.maxBudget);
    router.push(`/search?${params.toString()}`);
  }}
/>
```

## Avantages vs HeroSlideshow/HeroSpectacular

| Aspect            | HeroSimplified | HeroSlideshow | HeroSpectacular |
| ----------------- | -------------- | ------------- | --------------- |
| **Performance**   | ⭐⭐⭐⭐⭐     | ⭐⭐⭐        | ⭐⭐            |
| **Accessibilité** | ⭐⭐⭐⭐⭐     | ⭐⭐⭐⭐      | ⭐⭐⭐          |
| **Simplicité**    | ⭐⭐⭐⭐⭐     | ⭐⭐⭐        | ⭐⭐            |
| **SEO**           | ⭐⭐⭐⭐⭐     | ⭐⭐⭐⭐      | ⭐⭐⭐⭐        |
| **Maintenance**   | ⭐⭐⭐⭐⭐     | ⭐⭐⭐        | ⭐⭐            |

## Bonnes pratiques

### ✅ Recommandé

- Utiliser une image haute qualité (1920x1080 minimum)
- Garder le titre court et impactant
- Fournir un sous-titre descriptif
- Tester l'accessibilité avec un lecteur d'écran

### ❌ À éviter

- Changer l'image trop fréquemment
- Ajouter des effets visuels complexes
- Oublier la validation des champs
- Ignorer les retours clavier

## Migration depuis HeroSlideshow

1. **Remplacer l'import :**

   ```tsx
   // Avant
   import HeroSlideshow from '@/features/property/components/HeroSlideshow';

   // Après
   import { HeroSimplified } from '@/features/property';
   ```

2. **Ajuster les props :**

   ```tsx
   // Avant
   <HeroSlideshow />

   // Après
   <HeroSimplified onSearch={handleSearch} />
   ```

3. **Adapter la logique de recherche :**
   ```tsx
   // Adapter la fonction onSearch pour les nouvelles props
   const handleSearch = ({ city, propertyType, maxBudget }) => {
     // Votre logique existante
   };
   ```

## Accessibilité

Le composant respecte les standards WCAG 2.1 AA :

- **Contraste** : Ratio 4.5:1 minimum
- **Navigation clavier** : Tab/Enter/Space
- **Lecteurs d'écran** : ARIA labels et descriptions
- **Focus visible** : Indicateurs clairs
- **Tailles tactiles** : Minimum 44px

## Support navigateurs

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers

## Problèmes connus

Aucun problème connu à ce jour. Le composant a été testé sur les principaux navigateurs et appareils.
