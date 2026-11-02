# 📚 Exemples d'Utilisation - Menu Hamburger Mobile

Ce dossier contient des exemples pratiques d'utilisation du menu hamburger mobile MonToit.

## 🎯 Exemples Disponibles

### 1. **Usage Simple** (`SimpleUsage`)
**Fichier:** `examples/MenuUsageExamples.tsx`

Utilisation de base avec le Header composant :

```typescript
import Header from '../src/features/shared/components/Header';

function SimpleUsage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="p-8">
        <h1>Mon Application</h1>
        <p>Contenu principal...</p>
      </main>
    </div>
  );
}
```

**Caractéristiques:**
- ✅ Integration basique
- ✅ Header responsive automatique
- ✅ Menu hamburger sur mobile
- ✅ Navigation desktop sur desktop

---

### 2. **Usage Custom** (`CustomUsage`)
Utilisation avec hooks personnalisés pour plus de contrôle :

```typescript
import { useMobileMenu } from '../src/features/shared/hooks/useMobileMenu';

function CustomUsage() {
  const { isOpen, toggleMenu } = useMobileMenu();

  return (
    <>
      <Header />
      <button onClick={toggleMenu}>
        {isOpen ? 'Fermer' : 'Ouvrir'} Menu
      </button>
    </>
  );
}
```

**Caractéristiques:**
- ✅ Accès direct au hook useMobileMenu
- ✅ Bouton custom pour trigger
- ✅ État local connecté au menu global
- ✅ Effets visuels sur le contenu

---

### 3. **Layout Conditionnel** (`ConditionalLayout`)
Layout adaptatif selon la taille d'écran :

```typescript
function ConditionalLayout() {
  const { isOpen } = useMobileMenu();

  return (
    <div className="flex">
      {/* Sidebar desktop - cachée sur mobile */}
      <aside className="hidden md:block w-64">
        <nav>Navigation desktop</nav>
      </aside>

      {/* Contenu principal */}
      <div className="flex-1">
        <Header />
        <main>Contenu adaptatif</main>
      </div>
    </div>
  );
}
```

**Caractéristiques:**
- ✅ Sidebar desktop (≥768px)
- ✅ Menu hamburger mobile (<768px)
- ✅ Transitions fluides entre layouts
- ✅ Gestion d'état unifiée

---

### 4. **Page Complexe** (`ComplexPage`)
Implémentation avancée avec gestion d'état complexe :

```typescript
function ComplexPage() {
  const { isOpen, openMenu, closeMenu } = useMobileMenu();
  const [user, setUser] = React.useState(null);

  // Auto-close après navigation
  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(closeMenu, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, closeMenu]);

  return (
    <div>
      <Header />
      <div className={`transition-all ${isOpen ? 'opacity-30' : 'opacity-100'}`}>
        {/* Contenu avec effets visuels */}
      </div>
      {isOpen && <div className="overlay" />}
    </div>
  );
}
```

**Caractéristiques:**
- ✅ Gestion d'état complexe
- ✅ Auto-fermeture du menu
- ✅ Effets visuels sur le contenu
- ✅ Overlay indicators
- ✅ Intégration user management

---

### 5. **Avec Routing** (`AppWithRouting`)
Simulation de navigation avec routing :

```typescript
function AppWithRouting() {
  const [currentPage, setCurrentPage] = React.useState('home');
  const { isOpen } = useMobileMenu();

  const handleNavigation = (pageId: string) => {
    setCurrentPage(pageId);
    // Auto-fermeture via useMobileMenu
  };

  return (
    <div>
      <Header />
      <main className={isOpen ? 'hidden' : 'block'}>
        <h1>{getPageTitle(currentPage)}</h1>
        {/* Contenu par page */}
      </main>
    </div>
  );
}
```

**Caractéristiques:**
- ✅ Simulation routing simple
- ✅ Navigation programmatique
- ✅ Masquage contenu quand menu ouvert
- ✅ États de page dynamiques

---

### 6. **Test Performance** (`PerformanceTest`)
Tests et métriques de performance en temps réel :

```typescript
function PerformanceTest() {
  const { isOpen, toggleMenu } = useMobileMenu();
  const [metrics, setMetrics] = React.useState({});

  React.useEffect(() => {
    if (isOpen) {
      const start = performance.now();
      setTimeout(() => {
        const end = performance.now();
        setMetrics({ openTime: end - start });
      }, 0);
    }
  }, [isOpen]);

  return (
    <div>
      <Header />
      <div>
        <p>Temps d'ouverture: {metrics.openTime?.toFixed(2)}ms</p>
        <button onClick={toggleMenu}>Mesurer</button>
      </div>
    </div>
  );
}
```

**Caractéristiques:**
- ✅ Mesure temps d'ouverture
- ✅ Performance monitoring
- ✅ Métriques Core Web Vitals
- ✅ Validation 60fps

## 🚀 Utilisation des Exemples

### Dans votre Application

```typescript
// Import de l'exemple souhaité
import { SimpleUsage } from './mobile/responsive/examples/MenuUsageExamples';

// Utilisation
function App() {
  return <SimpleUsage />;
}
```

### Test Rapide

```typescript
// Exporter par défaut avec sélecteur
import MenuExamples from './mobile/responsive/examples/MenuUsageExamples';

function App() {
  return <MenuExamples />;
}
```

## 🎛️ Configuration

### Variables Disponibles

```css
/* Dans MobileMenu.css */
:root {
  --menu-animation-speed: 0.3s;     /* Vitesse animations */
  --menu-mobile-width: 320px;       /* Largeur menu mobile */
  --touch-target-min: 44px;         /* Taille minimum tactile */
}
```

### Personnalisation des Exemples

Chaque exemple peut être personnalisé :

```typescript
// Modifier les liens de navigation
const navigationItems = [
  { label: 'Votre Page', href: '/votre-page', icon: YourIcon }
];

// Personnaliser les animations
const customAnimations = {
  speed: '0.2s',
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
};
```

## 📱 Responsive Testing

### Breakpoints
- **Mobile**: < 768px → Hamburger menu
- **Tablet**: 768px - 1024px → Adaptatif
- **Desktop**: > 1024px → Navigation complète

### Tests Recommandés

1. **Redimensionnement**
   ```bash
   # Ouvrez les DevTools
   # Testez différentes largeurs
   # Vérifiez transition Hamburger ↔ Desktop
   ```

2. **Touch Testing**
   ```bash
   # Mode responsive mobile
   # Testez tous les touch targets
   # Vérifiez swipe gestures
   ```

3. **Performance**
   ```bash
   # Onglet Performance DevTools
   # Mesurez FPS pendant animations
   # Vérifiez memory usage
   ```

## 🔧 Extensions Possibles

### Ajouter un Nouvel Exemple

```typescript
// 1. Créer la fonction
export function MonNouvelExemple() {
  const { isOpen } = useMobileMenu();
  
  return (
    <div>
      <Header />
      <main>Mon contenu...</main>
    </div>
  );
}

// 2. L'ajouter au sélecteur
const examples = {
  simple: SimpleUsage,
  custom: CustomUsage,
  // ... autres exemples
  monExemple: MonNouvelExemple
};
```

### Personnalisation Avancée

```typescript
// Hook personnalisé
const useMonMenu = () => {
  const baseMenu = useMobileMenu();
  
  return {
    ...baseMenu,
    customAction: () => {
      // Logique custom
    }
  };
};

// Utilisation
function MonExemple() {
  const { customAction } = useMonMenu();
  
  return (
    <button onClick={customAction}>
      Action Custom
    </button>
  );
}
```

## 🎯 Bonnes Pratiques

### Performance
- ✅ Utilisez `React.memo` pour les composants lourds
- ✅ Évitez les re-renders inutiles dans les callbacks
- ✅ Utilisez `useCallback` pour les fonctions

### Accessibilité
- ✅ Testez aveclecteurs d'écran
- ✅ Vérifiez navigation clavier
- ✅ Respectez `prefers-reduced-motion`

### Mobile-First
- ✅ Testez sur vrais appareils
- ✅ Vérifiez touch targets (44px+)
- ✅ Optimisez pour thumbs

## 📊 Métriques de Référence

### Performance Targets
- **Opening Time**: < 100ms
- **FPS**: 60fps constant
- **Bundle Size**: < 10KB gzipped
- **Memory Usage**: < 1MB

### Accessibility Targets
- **Keyboard Navigation**: 100%
- **Screen Reader**: 100%
- **Color Contrast**: AA compliant
- **Touch Targets**: 44px+ all

---

**💡 Ces exemples couvrent tous les cas d'usage courants du menu hamburger mobile.**

Choisissez l'exemple qui correspond le mieux à votre besoin ou combinez-les pour créer votre solution personnalisée !