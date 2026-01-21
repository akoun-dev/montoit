// Intégration de la Page d'Ajout de Propriété
// =============================================

// 1. IMPORT dans votre fichier de routes (ex: src/app/routes.tsx)

// Lazy import des nouvelles pages
import { lazy, Suspense } from 'react';
import { AddPropertyPage } from '../features/property/pages';

// Exemple d'intégration dans les routes
const routes = [
{
path: '/add-property',
element: (
<Suspense fallback={<div className="flex items-center justify-center min-h-screen">

<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
</div>}>
<AddPropertyPage />
</Suspense>
)
}
];

// 2. NAVIGATION depuis le dashboard ou menu

// Exemple de lien dans un composant de navigation
const NavigationExample = () => {
return (

<nav>
<a href="/add-property" className="btn-primary">
Ajouter une Propriété
</a>

      {/* Ou avec React Router */}
      <Link to="/add-property" className="btn-primary">
        Ajouter une Propriété
      </Link>
    </nav>

);
};

// 3. INTÉGRATION DANS LE DASHBOARD

// Exemple de composant dashboard
const DashboardExample = () => {
return (

<div className="container mx-auto px-4 py-8">
<div className="flex justify-between items-center mb-8">
<h1 className="text-3xl font-bold">Mon Tableau de Bord</h1>
<a 
          href="/add-property" 
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
<svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
</svg>
Ajouter une Propriété
</a>
</div>

      {/* Contenu du dashboard */}
    </div>

);
};

// 4. CONFIGURATION SUPABASE

// Variables d'environnement à ajouter dans .env
const envVariables = `

# Supabase Configuration

REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key

# Property Upload Configuration

REACT_APP_MAX_FILE_SIZE=5242880
REACT_APP_MAX_IMAGES=20
REACT_APP_ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp
`;

// 5. SQL POUR SUPABASE

// Exécuter ces requêtes dans votre base Supabase
const supabaseSchema = `
-- Création de la table properties
CREATE TABLE IF NOT EXISTS properties (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
title TEXT NOT NULL,
description TEXT NOT NULL,
property_type TEXT NOT NULL CHECK (property_type IN ('appartement', 'maison', 'villa', 'terrain', 'bureau', 'local-commercial')),
bedrooms INTEGER NOT NULL CHECK (bedrooms >= 0),
bathrooms INTEGER NOT NULL CHECK (bathrooms >= 0),
area INTEGER NOT NULL CHECK (area > 0),
price DECIMAL NOT NULL CHECK (price > 0),
price_type TEXT NOT NULL CHECK (price_type IN ('achat', 'location')),
city TEXT NOT NULL,
district TEXT NOT NULL,
address TEXT NOT NULL,
coordinates JSONB,
images TEXT[] NOT NULL DEFAULT '{}',
main_image_index INTEGER DEFAULT 0,
amenities TEXT[] DEFAULT '{}',
furnished BOOLEAN DEFAULT FALSE,
parking BOOLEAN DEFAULT FALSE,
garden BOOLEAN DEFAULT FALSE,
terrace BOOLEAN DEFAULT FALSE,
elevator BOOLEAN DEFAULT FALSE,
security BOOLEAN DEFAULT FALSE,
owner_name TEXT NOT NULL,
owner_email TEXT NOT NULL,
owner_phone TEXT NOT NULL,
status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'sold', 'rented', 'archived')),
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_property_type ON properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at);

-- RLS (Row Level Security)
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Politique pour les utilisateurs authentifiés
CREATE POLICY "Users can insert their own properties" ON properties
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view published properties" ON properties
FOR SELECT USING (status = 'published');

CREATE POLICY "Users can update their own properties" ON properties
FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Création du bucket pour les images
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

-- Politique pour le storage
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'property-images');

CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'property-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own files" ON storage.objects
FOR UPDATE USING (bucket_id = 'property-images' AND auth.uid() IS NOT NULL);
`;

// 6. TEST D'INTÉGRATION

// Exemple de test simple
const IntegrationTest = () => {
// Vérifier que tous les composants s'importent correctement
try {
const { AddPropertyPage } = require('../features/property/pages');
const { usePropertyForm } = require('../features/property/hooks');
const { propertyService } = require('../features/property/services');

    console.log('✅ Tous les imports fonctionnent correctement');

    // Vérifier que le service a les méthodes attendues
    const methods = ['validatePropertyData', 'createProperty', 'getPopularCities'];
    methods.forEach(method => {
      if (typeof propertyService[method] === 'function') {
        console.log(`✅ Méthode ${method} disponible`);
      } else {
        console.log(`❌ Méthode ${method} manquante`);
      }
    });

} catch (error) {
console.error('❌ Erreur d\'import:', error);
}
};

// 7. EXEMPLE D'UTILISATION DANS UN COMPOSANT EXISTANT

// Dans votre composant Header ou Navigation
const HeaderWithAddProperty = () => {
return (

<header className="bg-white shadow">
<div className="container mx-auto px-4">
<nav className="flex justify-between items-center py-4">
<div className="flex items-center">
<a href="/" className="text-xl font-bold text-blue-600">
MonToit
</a>
</div>

          <div className="flex items-center space-x-4">
            <a href="/properties" className="text-gray-600 hover:text-gray-900">
              Propriétés
            </a>
            <a href="/dashboard" className="text-gray-600 hover:text-gray-900">
              Tableau de bord
            </a>
            <a
              href="/add-property"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ajouter un bien
            </a>
          </div>
        </nav>
      </div>
    </header>

);
};

// 8. CHECKLIST D'INTÉGRATION

const integrationChecklist = {
routes: false, // Routes configurées dans l'app
navigation: false, // Liens ajoutés dans le menu
supabase: false, // Base de données configurée
storage: false, // Bucket de stockage configuré
styles: false, // CSS importé dans l'app
environment: false, // Variables d'environnement définies
tests: false // Tests unitaires ajoutés
};

// 9. COMMANDES POUR FINALISER L'INTÉGRATION

const finalCommands = `

# 1. Installer les dépendances

npm install

# 2. Configurer les variables d'environnement

cp .env.example .env

# Éditer .env avec vos clés Supabase

# 3. Exécuter les migrations Supabase

# Copier et exécuter supabaseSchema dans l'éditeur SQL de Supabase

# 4. Importer les styles CSS dans votre app principale

# Ajouter dans src/index.css :

# @import './features/property/styles/add-property.css';

# 5. Démarrer l'application

npm start

# 6. Tester la page

# Ouvrir http://localhost:3000/add-property

`;

console.log('Guide d\'intégration de la page d\'ajout de propriété');
console.log('='.repeat(50));
console.log('Pour finaliser l\'intégration, suivez les étapes ci-dessus.');
console.log('Tous les composants sont prêts à être utilisés !');
