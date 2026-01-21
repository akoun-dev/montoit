/**
 * Script de test direct pour l'API ONECI
 * Exécutez avec: node scripts/test-oneci.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lire le fichier .env pour récupérer les clés
function loadEnvConfig() {
  const envPath = path.join(__dirname, '../.env');

  if (!fs.existsSync(envPath)) {
    console.error('❌ Fichier .env non trouvé à:', envPath);
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = {};

  envContent.split('\n').forEach(line => {
    const match = line.match(/^VITE_ONECI_(.+)=(.+)$/);
    if (match) {
      const key = match[1];
      let value = match[2].trim();
      // Retirer les guillemets si présents
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      envVars[key] = value;
    }
  });

  return {
    baseUrl: envVars.API_URL || 'https://api-rnpp.verif.ci/api/v1',
    apiKey: envVars.API_KEY,
    secretKey: envVars.SECRET_KEY,
  };
}

const CONFIG = loadEnvConfig();

console.log('📋 Configuration chargée:');
console.log('  URL:', CONFIG.baseUrl);
console.log('  API Key:', CONFIG.apiKey ? CONFIG.apiKey.substring(0, 20) + '...' : 'Non configurée');
console.log('  Secret Key:', CONFIG.secretKey ? CONFIG.secretKey.substring(0, 5) + '...' : 'Non configurée');

if (!CONFIG.apiKey || !CONFIG.secretKey) {
  console.error('\n❌ Clés API ONECI non trouvées dans le fichier .env');
  console.error('Assurez-vous que VITE_ONECI_API_KEY et VITE_ONECI_SECRET_KEY sont définis');
  process.exit(1);
}

// Données de test à essayer
const TEST_CASES = [
  // Cas 1: Postman avec variations de nom/prénom
  {
    name: 'Postman - YAO GNEKPIE FLORENT (nom inversé)',
    nni: '11793253275',
    data: {
      FIRST_NAME: 'YAO',
      LAST_NAME: 'GNEKPIE FLORENT',
      GENDER: 'M'
    }
  },
  // Cas 2: Postman avec seulement prénom
  {
    name: 'Postman - Seulement GNEKPIE',
    nni: '11793253275',
    data: {
      FIRST_NAME: 'GNEKPIE FLORENT',
      GENDER: 'M'
    }
  },
  // Cas 3: Postman avec différentes dates (années 80s)
  {
    name: 'Postman - Date 1980-01-01',
    nni: '11793253275',
    data: {
      FIRST_NAME: 'GNEKPIE FLORENT',
      LAST_NAME: 'YAO',
      BIRTH_DATE: '1980-01-01',
      GENDER: 'M'
    }
  },
  // Cas 4: Postman - Date 1975-01-01
  {
    name: 'Postman - Date 1975-01-01',
    nni: '11793253275',
    data: {
      FIRST_NAME: 'GNEKPIE FLORENT',
      LAST_NAME: 'YAO',
      BIRTH_DATE: '1975-01-01',
      GENDER: 'M'
    }
  },
  // Cas 5: Postman - Date 1990-01-01
  {
    name: 'Postman - Date 1990-01-01',
    nni: '11793253275',
    data: {
      FIRST_NAME: 'GNEKPIE FLORENT',
      LAST_NAME: 'YAO',
      BIRTH_DATE: '1990-01-01',
      GENDER: 'M'
    }
  },
  // Cas 6: Vos vraies données - Avec date de naissance
  {
    name: 'NNI 12004091753 - AKOUN BERNARD ABOA + Date',
    nni: '12004091753',
    data: {
      FIRST_NAME: 'AKOUN BERNARD',
      LAST_NAME: 'ABOA',
      BIRTH_DATE: '2000-12-31',
      GENDER: 'M'
    }
  },
  // Cas 7: Sans date de naissance
  {
    name: 'NNI 12004091753 - Sans date',
    nni: '12004091753',
    data: {
      FIRST_NAME: 'AKOUN BERNARD',
      LAST_NAME: 'ABOA',
      GENDER: 'M'
    }
  },
  // Cas 8: Prénom seul (AKOUN)
  {
    name: 'NNI 12004091753 - AKOUN seulement',
    nni: '12004091753',
    data: {
      FIRST_NAME: 'AKOUN',
      LAST_NAME: 'ABOA',
      BIRTH_DATE: '2000-12-31',
      GENDER: 'M'
    }
  },
  // Cas 9: Prénom seul (BERNARD)
  {
    name: 'NNI 12004091753 - BERNARD seulement',
    nni: '12004091753',
    data: {
      FIRST_NAME: 'BERNARD',
      LAST_NAME: 'ABOA',
      BIRTH_DATE: '2000-12-31',
      GENDER: 'M'
    }
  },
  // Cas 10: Avec trait d'union
  {
    name: 'NNI 12004091753 - AKOUN-BERNARD (trait d\'union)',
    nni: '12004091753',
    data: {
      FIRST_NAME: 'AKOUN-BERNARD',
      LAST_NAME: 'ABOA',
      BIRTH_DATE: '2000-12-31',
      GENDER: 'M'
    }
  },
  // Cas 11: Différentes dates (possibles)
  {
    name: 'NNI 12004091753 - Date 1999-12-31',
    nni: '12004091753',
    data: {
      FIRST_NAME: 'AKOUN BERNARD',
      LAST_NAME: 'ABOA',
      BIRTH_DATE: '1999-12-31',
      GENDER: 'M'
    }
  },
  // Cas 12: Date 2001-01-01
  {
    name: 'NNI 12004091753 - Date 2001-01-01',
    nni: '12004091753',
    data: {
      FIRST_NAME: 'AKOUN BERNARD',
      LAST_NAME: 'ABOA',
      BIRTH_DATE: '2001-01-01',
      GENDER: 'M'
    }
  }
];

// Fonction pour authentifier et obtenir le token
async function authenticate() {
  console.log('\n🔐 Authentification...');

  try {
    const response = await fetch(`${CONFIG.baseUrl}/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: CONFIG.apiKey,
        secretKey: CONFIG.secretKey,
      }),
    });

    if (!response.ok) {
      throw new Error(`Auth failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Authentification réussie');
    return data.bearerToken;
  } catch (error) {
    console.error('❌ Erreur d\'authentification:', error.message);
    throw error;
  }
}

// Fonction pour tester la vérification d'identité
async function testVerification(token, testCase) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📝 Test: ${testCase.name}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`NNI: ${testCase.nni}`);
  console.log('Données:', JSON.stringify(testCase.data, null, 2));

  // Créer le FormData
  const formData = new FormData();
  Object.entries(testCase.data).forEach(([key, value]) => {
    formData.append(key, value);
  });

  try {
    const response = await fetch(`${CONFIG.baseUrl}/oneci/persons/${testCase.nni}/match`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    console.log(`\n📥 Réponse HTTP:`);
    console.log(`  Status: ${response.status} ${response.statusText}`);

    // Récupérer le texte brut
    const text = await response.text();
    console.log(`\n📄 Corps de la réponse (brut):`);
    console.log(text);

    // Essayer de parser en JSON
    try {
      const json = JSON.parse(text);
      console.log(`\n📊 JSON parsé:`);
      console.log(JSON.stringify(json, null, 2));

      // Analyser la réponse
      if (Array.isArray(json)) {
        if (json.length === 0) {
          console.log('\n⚠️  Tableau vide: Aucune correspondance trouvée');
        } else {
          console.log('\n📋 Tableau d\'erreurs de correspondance:');
          json.forEach((item, index) => {
            console.log(`  [${index}] ${JSON.stringify(item)}`);
          });
        }
      } else if (json.code === '99') {
        console.log('\n❌ Erreur Code 99: Données invalides');
      } else if (json.code) {
        console.log(`\n❌ Erreur Code ${json.code}: ${json.message}`);
      } else if (json.matchScore !== undefined) {
        console.log(`\n✅ Succès avec score: ${json.matchScore}`);
      }

      return json;
    } catch (e) {
      console.log('\n⚠️  La réponse n\'est pas du JSON valide');
      return text;
    }

  } catch (error) {
    console.error(`\n❌ Erreur de requête:`, error.message);
    return null;
  }
}

// ========== TEST DE RÉCUPÉRATION AVEC NNI SEULEMENT ==========

async function testNniLookup(token, nni) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🔍 TEST: Récupération infos avec NNI seulement: ${nni}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Différents endpoints à tester
  const endpoints = [
    `${CONFIG.baseUrl}/oneci/persons/${nni}`,
    `${CONFIG.baseUrl}/oneci/persons/${nni}/info`,
    `${CONFIG.baseUrl}/oneci/persons/${nni}/details`,
    `${CONFIG.baseUrl}/oneci/persons/${nni}/get`,
  ];

  for (const endpoint of endpoints) {
    console.log(`\n📡 Test endpoint: ${endpoint}`);
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log(`  Status: ${response.status} ${response.statusText}`);

      const text = await response.text();
      if (text) {
        console.log(`  Réponse:`, text.substring(0, 200));
        try {
          const json = JSON.parse(text);
          console.log(`  JSON:`, JSON.stringify(json, null, 2));
        } catch (e) {
          // Pas du JSON
        }
      } else {
        console.log(`  Réponse vide`);
      }

      if (response.ok) {
        console.log(`  ✅ SUCCÈS avec cet endpoint !`);
        return { success: true, endpoint, data: text };
      }
    } catch (error) {
      console.log(`  ❌ Erreur:`, error.message);
    }
  }

  return { success: false };
}

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   Script de Test API ONECI            ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`URL de base: ${CONFIG.baseUrl}`);

  let token;
  try {
    token = await authenticate();
  } catch (error) {
    console.error('\n💥 Impossible de continuer sans authentification');
    console.error('Vérifiez vos clés API dans la configuration du script');
    process.exit(1);
  }

  // ========== TEST DE RÉCUPÉRATION AVEC NNI SEULEMENT ==========
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║   TEST: Récupération infos avec NNI       ║');
  console.log('╚══════════════════════════════════════╝');

  const nnisToTest = ['12004091753', 'CI005491961', 'I005491961'];
  const lookupResults = [];

  for (const nni of nnisToTest) {
    const result = await testNniLookup(token, nni);
    lookupResults.push({ nni, ...result });
  }

  // Résumé des tests de lookup
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║   RÉSUMÉ LOOKUP NNI                    ║');
  console.log('╚══════════════════════════════════════╝');
  lookupResults.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${index + 1}. ${status} NNI: ${result.nni}${result.success ? ` - Endpoint: ${result.endpoint}` : ''}`);
  });

  const successfulLookup = lookupResults.find(r => r.success);
  if (successfulLookup) {
    console.log('\n🎉 SUCCÈS: Un endpoint permet de récupérer les infos avec le NNI !');
    console.log('Endpoint:', successfulLookup.endpoint);
  } else {
    console.log('\n⚠️  Aucun endpoint trouvé pour récupérer les infos avec le NNI seul');
    console.log('L\'API nécessite les informations complètes (nom, prénom, date, sexe)');
  }

  // ========== TESTS DE VÉRIFICATION ==========
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║   TESTS DE VÉRIFICATION PAR ATTRIBUTS    ║');
  console.log('╚══════════════════════════════════════╝');

  const results = [];

  for (const testCase of TEST_CASES) {
    const result = await testVerification(token, testCase);
    results.push({
      name: testCase.name,
      nni: testCase.nni,
      success: result !== null,
      result: result
    });

    // Pause entre les requêtes
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Résumé
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║   RÉSUMÉ DES TESTS                    ║');
  console.log('╚══════════════════════════════════════╝');

  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${result.name} (NNI: ${result.nni})`);
  });

  // Identifier le cas réussi
  const successfulCase = results.find(r => r.success && r.result && !Array.isArray(r.result));
  if (successfulCase) {
    console.log('\n🎉 CAS RÉUSSI: ' + successfulCase.name);
    console.log('NNI:', successfulCase.nni);
    console.log('Données:', JSON.stringify(successfulCase.result, null, 2));
  } else {
    console.log('\n⚠️  Aucun cas n\'a fonctionné');
    console.log('Vérifiez les clés API et les données de test');
  }
}

// Exécuter le script
main().catch(error => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
});
