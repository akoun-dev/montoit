const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY; // Nécessite service role key

if (!supabaseUrl || !supabaseKey) {
  console.error('Veuillez définir VITE_SUPABASE_URL et VITE_SUPABASE_SERVICE_ROLE_KEY dans .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const testUsers = [
  // Comptes de développement
  { email: 'locataire@test.com', password: 'Test123', fullName: 'Marie Konan', userType: 'locataire' },
  { email: 'proprietaire@test.com', password: 'Test123', fullName: 'Jean Kouadio', userType: 'proprietaire' },
  { email: 'agence@test.com', password: 'Test123', fullName: 'Agence Immobilière Abidjan', userType: 'agence' },
  { email: 'admin@test.com', password: 'Admin123', fullName: 'Administrateur ANSUT', userType: 'admin_ansut' },
  { email: 'super@test.com', password: 'Super123', fullName: 'Super Administrateur ANSUT', userType: 'admin_ansut' },

  // Comptes de démonstration
  { email: 'demo@locataire.ci', password: 'Demo2025', fullName: 'Demo Locataire', userType: 'locataire' },
  { email: 'demo@proprietaire.ci', password: 'Demo2025', fullName: 'Demo Propriétaire', userType: 'proprietaire' },
  { email: 'demo@agence.ci', password: 'Demo2025', fullName: 'Demo Agence', userType: 'agence' },

  // Comptes de staging
  { email: 'staging@locataire.ci', password: 'Staging2025', fullName: 'Staging Locataire', userType: 'locataire' },
  { email: 'staging@proprietaire.ci', password: 'Staging2025', fullName: 'Staging Propriétaire', userType: 'proprietaire' },
  { email: 'staging@agence.ci', password: 'Staging2025', fullName: 'Staging Agence', userType: 'agence' }
];

async function createUsers() {
  console.log('Création des utilisateurs de test...');

  for (const user of testUsers) {
    try {
      console.log(`Création de ${user.email}...`);

      // Créer l'utilisateur avec admin.auth.createUser
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.fullName,
          user_type: user.userType
        }
      });

      if (authError) {
        console.error(`Erreur lors de la création de ${user.email}:`, authError);
        continue;
      }

      console.log(`✓ ${user.email} créé avec succès (ID: ${authData.user.id})`);

      // Attendre un peu pour éviter les rate limits
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`Erreur inattendue pour ${user.email}:`, error);
    }
  }

  console.log('Création des utilisateurs terminée !');
}

createUsers().catch(console.error);