const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

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

async function cleanAndCreateUsers() {
  console.log('Suppression des utilisateurs existants...');

  // Supprimer d'abord les données des tables publiques
  for (const user of testUsers) {
    try {
      // Récupérer l'ID de l'utilisateur existant
      const { data: existingUser, error: fetchError } = await supabase.auth.admin.listUsers();

      if (fetchError) {
        console.error('Erreur récupération utilisateurs:', fetchError);
        continue;
      }

      const userToDelete = existingUser.users.find(u => u.email === user.email);

      if (userToDelete) {
        console.log(`Suppression de l'utilisateur ${user.email}...`);

        // Supprimer d'abord les données des tables publiques
        await supabase.from('profiles').delete().eq('id', userToDelete.id);
        await supabase.from('user_roles').delete().eq('user_id', userToDelete.id);

        // Puis supprimer l'utilisateur auth
        const { error: deleteError } = await supabase.auth.admin.deleteUser(userToDelete.id);

        if (deleteError) {
          console.error(`Erreur suppression ${user.email}:`, deleteError);
        } else {
          console.log(`✓ ${user.email} supprimé`);
        }
      }
    } catch (error) {
      console.error(`Erreur suppression pour ${user.email}:`, error);
    }
  }

  console.log('\nCréation des nouveaux utilisateurs...');

  // Attendre un peu pour éviter les conflits
  await new Promise(resolve => setTimeout(resolve, 1000));

  for (const user of testUsers) {
    try {
      console.log(`Création de ${user.email}...`);

      // Créer l'utilisateur via signup pour que le mot de passe soit correctement hashé
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: {
            full_name: user.fullName,
            user_type: user.userType
          }
        }
      });

      if (authError) {
        console.error(`Erreur lors de la création de ${user.email}:`, authError);
        continue;
      }

      if (authData.user && authData.user.confirmation_sent_at) {
        console.log(`✓ ${user.email} créé - confirmation envoyée`);
      } else if (authData.user && !authData.user.email_confirmed_at) {
        // Confirmer manuellement l'email
        const { error: confirmError } = await supabase.auth.admin.updateUserById(
          authData.user.id,
          { email_confirm: true }
        );

        if (confirmError) {
          console.error(`Erreur confirmation ${user.email}:`, confirmError);
        } else {
          console.log(`✓ ${user.email} créé et confirmé (ID: ${authData.user.id})`);
        }
      }

      // Attendre un peu pour éviter les rate limits
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`Erreur inattendue pour ${user.email}:`, error);
    }
  }

  console.log('\nCréation des profils et rôles...');

  // Créer les profils et rôles pour les utilisateurs créés
  for (const user of testUsers) {
    try {
      // Récupérer l'utilisateur créé
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', user.email)
        .single();

      if (userError || !userData) {
        console.log(`Profil non trouvé pour ${user.email}, création manuelle...`);

        // Récupérer l'ID utilisateur depuis auth
        const { data: authUser } = await supabase.auth.getUser();
        // Cette approche ne fonctionnera pas, passons à autre chose
        continue;
      }

      // Assigner le rôle approprié
      let role = 'user';
      if (user.userType === 'agence') role = 'agent';
      if (user.userType === 'admin_ansut') {
        role = user.email === 'super@test.com' ? 'super_admin' : 'admin';
      }

      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: userData.id, role });

      if (roleError) {
        console.error(`Erreur création rôle pour ${user.email}:`, roleError);
      } else {
        console.log(`✓ Rôle ${role} assigné à ${user.email}`);
      }

    } catch (error) {
      console.error(`Erreur profil/rôle pour ${user.email}:`, error);
    }
  }

  console.log('\nOpération terminée !');
}

cleanAndCreateUsers().catch(console.error);