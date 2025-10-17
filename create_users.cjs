const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Veuillez définir VITE_SUPABASE_URL et VITE_SUPABASE_SERVICE_ROLE_KEY dans .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
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
  console.log('Création des utilisateurs de test...\n');

  for (const user of testUsers) {
    try {
      console.log(`📧 Création de ${user.email}...`);

      // Utiliser l'API admin pour créer l'utilisateur avec email confirmé
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
        console.error(`❌ Erreur lors de la création de ${user.email}:`, authError.message);
        continue;
      }

      const userId = authData.user.id;
      console.log(`✅ Utilisateur créé: ${user.email} (ID: ${userId})`);

      // Attendre un peu pour éviter les rate limits
      await new Promise(resolve => setTimeout(resolve, 300));

      // Créer le profil
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          full_name: user.fullName,
          user_type: user.userType,
          phone: null
        });

      if (profileError) {
        console.error(`⚠️  Erreur création profil pour ${user.email}:`, profileError.message);
      } else {
        console.log(`✅ Profil créé pour ${user.email}`);
      }

      // Assigner le rôle approprié
      let role = 'user';
      if (user.userType === 'agence') role = 'agent';
      if (user.userType === 'admin_ansut') {
        role = user.email === 'super@test.com' ? 'super_admin' : 'admin';
      }

      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: role
        });

      if (roleError) {
        console.error(`⚠️  Erreur création rôle pour ${user.email}:`, roleError.message);
      } else {
        console.log(`✅ Rôle '${role}' assigné à ${user.email}`);
      }

      console.log(`✨ ${user.email} complètement configuré\n`);

      // Attendre un peu entre les utilisateurs
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`❌ Erreur inattendue pour ${user.email}:`, error.message);
    }
  }

  console.log('\n🎉 Création des utilisateurs terminée !');

  // Vérification
  console.log('\n📊 Vérification des comptes créés:');
  for (const user of testUsers) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, user_type')
        .eq('email', user.email)
        .single();

      if (error) {
        console.log(`❌ ${user.email}: Non trouvé`);
      } else {
        console.log(`✅ ${user.email}: ${data.full_name} (${data.user_type})`);
      }
    } catch (err) {
      console.log(`❌ ${user.email}: Erreur de vérification`);
    }
  }
}

createUsers().catch(console.error);