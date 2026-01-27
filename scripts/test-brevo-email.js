#!/usr/bin/env node

/**
 * Script de test pour l'envoi d'emails via Brevo API
 *
 * Usage:
 *   node scripts/test-brevo-email.js [email@example.com]
 *
 * Si aucun email n'est fourni, utilise un email par défaut
 */

import 'dotenv/config';
import fetch from 'node-fetch';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'no-reply@montoit.ci';
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'Mon Toit';

// Email de test (à remplacer par votre email pour tester)
const TEST_EMAIL = process.argv[2] || 'tmerguez1@gmail.com';

/**
 * Génère le template HTML pour l'email OTP
 */
function generateOTPEmailTemplate(otp, userName = 'Test User') {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Code de vérification - Mon Toit</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #2C1810;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #FAF7F4;
        }
        .header {
          text-align: center;
          padding: 30px 0;
          border-bottom: 2px solid #F16522;
          background: white;
          border-radius: 20px 20px 0 0;
        }
        .logo {
          width: 60px;
          height: 60px;
          background: #F16522;
          border-radius: 15px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          font-size: 24px;
        }
        .content {
          padding: 40px 30px;
          background: white;
          margin: -1px 0;
          text-align: center;
        }
        .otp-code {
          display: inline-block;
          background: #F8F8F8;
          padding: 20px 40px;
          border-radius: 15px;
          border: 2px solid #F16522;
          box-shadow: 0 4px 15px rgba(241, 101, 34, 0.1);
          font-size: 36px;
          font-weight: bold;
          color: #F16522;
          letter-spacing: 8px;
          margin: 30px 0;
        }
        .security-notice {
          background: #FFF3E0;
          padding: 20px;
          border-radius: 10px;
          border-left: 4px solid #F16522;
          margin: 30px 0;
          text-align: left;
        }
        .footer {
          text-align: center;
          padding: 30px;
          background: #2C1810;
          color: white;
          border-radius: 0 0 20px 20px;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">🏠</div>
        <h1 style="margin: 0; color: #2C1810; font-size: 32px;">Mon Toit</h1>
        <p style="margin: 5px 0 0; color: #6B5A4E;">Votre plateforme immobilière de confiance</p>
      </div>

      <div class="content">
        <h2 style="color: #2C1810; margin-bottom: 30px;">🔐 Code de vérification</h2>

        <p style="font-size: 16px; margin-bottom: 30px;">
          Bonjour ${userName},<br><br>
          Vous avez demandé un code de vérification pour accéder à votre compte Mon Toit.
        </p>

        <div class="otp-code">${otp}</div>

        <p style="font-size: 16px; color: #6B5A4E;">
          Ce code est valide pendant <strong>10 minutes</strong>.
        </p>

        <div class="security-notice">
          <p style="margin: 0; color: #8B6914;">
            <strong>⚠️ Sécurité :</strong> Ne partagez jamais ce code avec qui que ce soit.
            L'équipe Mon Toit ne vous demandera jamais votre code par téléphone ou email.
          </p>
        </div>
      </div>

      <div class="footer">
        <p style="margin: 0 0 10px;">
          <strong>Mon Toit</strong> - Certifié ANSUT Côte d'Ivoire
        </p>
        <p style="margin: 0;">
          📞 Contact: +225 07 XX XX XX XX<br>
          🌐 www.montoit.ci<br>
          📍 Cocody, Abidjan, Côte d'Ivoire
        </p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Test d'envoi d'email simple
 */
async function testSimpleEmail() {
  console.log('\n📧 Test 1: Email simple sans template\n');

  const payload = {
    sender: {
      email: BREVO_SENDER_EMAIL,
      name: BREVO_SENDER_NAME,
    },
    to: [
      {
        email: TEST_EMAIL,
        name: 'Test User',
      },
    ],
    subject: '🧪 Test Email - Mon Toit',
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <body>
        <h1>Test Email Brevo</h1>
        <p>Ceci est un email de test pour vérifier la configuration Brevo.</p>
        <p>Si vous recevez cet email, la configuration est correcte ! ✅</p>
        <hr>
        <p><small>Envoyé depuis le script de test Mon Toit</small></p>
      </body>
      </html>
    `,
  };

  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return false;
    }

    const data = await response.json();
    console.log('✅ Email envoyé avec succès !');
    console.log('Message ID:', data.messageId);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi:', error.message);
    return false;
  }
}

/**
 * Test d'envoi d'email OTP (avec template complet)
 */
async function testOTPEmail() {
  console.log('\n📧 Test 2: Email OTP (template complet)\n');

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log('OTP généré:', otp);

  const payload = {
    sender: {
      email: BREVO_SENDER_EMAIL,
      name: BREVO_SENDER_NAME,
    },
    to: [
      {
        email: TEST_EMAIL,
        name: 'Test User',
      },
    ],
    subject: '🔐 Mon Toit - Code de vérification',
    htmlContent: generateOTPEmailTemplate(otp),
  };

  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return false;
    }

    const data = await response.json();
    console.log('✅ Email OTP envoyé avec succès !');
    console.log('Message ID:', data.messageId);
    console.log('🔑 Code OTP:', otp);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi:', error.message);
    return false;
  }
}

/**
 * Test de vérification de la clé API
 */
async function testAPIKey() {
  console.log('\n🔑 Test 0: Vérification de la clé API\n');

  if (!BREVO_API_KEY) {
    console.error('❌ BREVO_API_KEY n\'est pas définie dans les variables d\'environnement');
    return false;
  }

  console.log('Clé API:', BREVO_API_KEY.substring(0, 20) + '...');
  console.log('Sender email:', BREVO_SENDER_EMAIL);
  console.log('Sender name:', BREVO_SENDER_NAME);

  // Vérifier la clé avec un simple appel à l'API
  try {
    const response = await fetch('https://api.brevo.com/v3/account', {
      method: 'GET',
      headers: {
        'api-key': BREVO_API_KEY,
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Clé API valide !');
      console.log('Compte:', JSON.stringify(data, null, 2));
      return true;
    } else {
      console.error('❌ Clé API invalide');
      const errorText = await response.text();
      console.error('Error:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error.message);
    return false;
  }
}

/**
 * Main
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║        Script de test Brevo Email API                 ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('\nEmail de destination:', TEST_EMAIL);
  console.log('Heure:', new Date().toISOString());

  // Test 0: Vérifier la clé API
  const keyValid = await testAPIKey();
  if (!keyValid) {
    console.log('\n❌ Arrêt des tests: clé API invalide');
    process.exit(1);
  }

  // Test 1: Email simple
  const simpleSuccess = await testSimpleEmail();

  // Attendre un peu entre les emails
  if (simpleSuccess) {
    console.log('\n⏳ Attente de 2 secondes avant le prochain test...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Test 2: Email OTP
  const otpSuccess = await testOTPEmail();

  // Résumé
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                    RÉSUMÉ                             ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`Test 1 (Email simple):  ${simpleSuccess ? '✅ SUCCÈS' : '❌ ÉCHEC'}`);
  console.log(`Test 2 (Email OTP):     ${otpSuccess ? '✅ SUCCÈS' : '❌ ÉCHEC'}`);
  console.log('\nVérifiez votre boîte mail:', TEST_EMAIL);

  process.exit(simpleSuccess && otpSuccess ? 0 : 1);
}

main().catch(error => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});
