# Composants UI Refactorisés

## Vue d'ensemble

Les composants UI de base (Button, Input, Card) ont été refactorisés pour utiliser les nouveaux design tokens CSS et respecter les spécifications WCAG AA.

## 🎨 Design Tokens Utilisés

### Couleurs

- **neutral-900** : Texte principal (ratio de contraste 21:1)
- **neutral-700** : Texte secondaire (ratio de contraste 7.25:1)
- **primary-500** : Boutons CTA (ratio de contraste 4.5:1 minimum)

### Espacement

- **Padding minimum** : 32px (spacing-8) pour les Cards
- **Touch targets** : 44px minimum pour l'accessibilité
- **Grid spacing** : Système 4pt pour la cohérence

### Typographie

- Utilisation des tokens : text-h1 à text-body, text-small, text-xs
- Hauteurs de ligne : leading-heading, leading-body, leading-relaxed
- Espacement des lettres : tracking-tight, tracking-normal, tracking-wide

## 🔄 Changements par Composant

### Button.tsx

**Nouvelles fonctionnalités :**

- ✅ Support des tailles : small, medium, large
- ✅ Variantes : primary, secondary, outline, ghost, danger
- ✅ États : loading, disabled
- ✅ Accessibilité : aria-busy, focus visible
- ✅ Touch targets WCAG AA (44px minimum)

**Design Tokens :**

```css
/* Tailles */
small: px-4 py-2 text-small min-h-[44px]
medium: px-6 py-3 text-body min-h-[48px]
large: px-8 py-4 text-h5 min-h-[56px]

/* Variantes */
primary: bg-primary-500, hover:bg-primary-700
secondary: border-2 border-primary-500
```

### Input.tsx

**Nouvelles fonctionnalités :**

- ✅ Système de validation complet
- ✅ Support des icônes gauche/droite
- ✅ Messages d'aide et d'erreur
- ✅ États de validation : error, success, warning
- ✅ Accessibilité : aria-invalid, aria-describedby

**Améliorations accessibilité :**

- Labels associés correctement
- Messages d'erreur avec role="alert"
- Contraste de couleur conforme WCAG AA
- Navigation clavier optimisée

### Card.tsx

**Nouvelles fonctionnalités :**

- ✅ Hover states avec animations fluides
- ✅ Variante interactive (clickable)
- ✅ Padding minimum 32px garanti
- ✅ États de focus pour navigation clavier
- ✅ Composants : CardHeader, CardBody, CardFooter, CardTitle, CardDescription

**Hover Effects :**

```css
/* Utilise les tokens de transformation */
hover:translateY(-4px)
hover:scale(1.01)
transition: var(--animation-duration-fast)
```

## 🎯 Conformité WCAG AA

### Contrastes de Couleur

- ✅ neutral-900 : 21:1 (AAA)
- ✅ neutral-700 : 7.25:1 (AA)
- ✅ primary-500 : 4.5:1 (AA minimum)

### Navigation Clavier

- ✅ Focus visible avec ring focus personnalisé
- ✅ Tab order logique
- ✅ Touch targets 44px minimum
- ✅ Skip links supportés

### ARIA et Sémantique

- ✅ Labels appropriés
- ✅ Descriptions via aria-describedby
- ✅ États via aria-invalid, aria-busy
- ✅ Rôles sémantiques

## 🚀 Utilisation

### Button

```tsx
import { Button } from '@/shared/ui';

<Button variant="primary" size="large">
  Action principale
</Button>

<Button variant="secondary" loading>
  Chargement...
</Button>
```

### Input

```tsx
import { Input } from '@/shared/ui';

<Input
  label="Email"
  type="email"
  error={errors.email}
  helperText="Format email requis"
  leftIcon={<MailIcon />}
  required
  fullWidth
/>;
```

### Card

```tsx
import { Card, CardHeader, CardBody, CardFooter } from '@/shared/ui';

<Card variant="interactive" hoverable padding="lg">
  <CardHeader title="Titre de la card" subtitle="Sous-titre explicatif" />
  <CardBody>
    <p>Contenu principal</p>
  </CardBody>
  <CardFooter align="right">
    <Button>Action</Button>
  </CardFooter>
</Card>;
```

## 📦 Exports Disponibles

```typescript
// Composants principaux
export { Button } from './Button';
export { Input } from './Input';
export {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from './Card';

// Démonstration
export { UIComponentsDemo } from './UIComponentsDemo';
```

## 🔧 Design Tokens Ajoutés

Nouvelles classes utilitaires ajoutées au design system :

```css
/* Transformations */
.hover\:scale-101:hover {
  transform: scale(1.01);
}
.hover\:scale-102:hover {
  transform: scale(1.02);
}
.hover\:-translate-y-1:hover {
  transform: translateY(-4px);
}
.active\:scale-99:active {
  transform: scale(0.99);
}

/* Bordures sémantiques */
.border-semantic-error {
  border-color: var(--color-semantic-error);
}
.border-semantic-success {
  border-color: var(--color-semantic-success);
}
.border-semantic-warning {
  border-color: var(--color-semantic-warning);
}
```

## 📝 Tests et Validation

Le composant `UIComponentsDemo.tsx` contient une démonstration complète de tous les composants refactorisés, incluant :

- Tests de validation de formulaire
- Démonstration des états hover/active
- Exemples d'accessibilité
- Tests de responsivité

## ✅ Checklist de Conformité

- [x] Utilisation des design tokens CSS
- [x] Couleurs : neutral-900, neutral-700, primary-500
- [x] Padding Card minimum 32px
- [x] Button : primary, secondary, large, small
- [x] Input : labels, validation, accessibilité
- [x] Hover states Card avec animations
- [x] Conformité WCAG AA
- [x] Touch targets 44px minimum
- [x] Focus visible et navigation clavier
- [x] Contrastes de couleur validés
- [x] ARIA labels et descriptions
- [x] Documentation et exemples

## 🎉 Résultat

Tous les composants UI de base sont maintenant :

- ✅ Cohérents visuellement
- ✅ Accessibles WCAG AA
- ✅ Performants avec animations fluides
- ✅ Maintenables avec design tokens
- ✅ Documentés avec exemples d'utilisation
