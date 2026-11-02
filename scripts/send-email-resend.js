#!/usr/bin/env node

/**
 * Script d'envoi d'emails via Resend API
 * Usage: node scripts/send-email-resend.js <to> <template> [data_json]
 *
 * Exemples:
 *   node scripts/send-email-resend.js user@example.com welcome '{"name":"Jean"}'
 *   node scripts/send-email-resend.js user@example.com email-verification '{"otp":"123456","name":"Jean"}'
 */

import fetch from 'node-fetch';

// Configuration Resend
const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_DvxxTkmv_KLgX7D1LSvr4tVZK1EUtRLv9';
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'no-reply@notifications.ansut.ci';
const RESEND_API_URL = 'https://api.resend.com/emails';

// Templates d'emails
const emailTemplates = {
  'email-verification': {
    subject: 'Vérifiez votre adresse email - Mon Toit',
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #f97316, #ea580c); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
          .otp-code { background: #fff7ed; border: 3px dashed #f97316; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #f97316; margin: 20px 0; border-radius: 10px; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔐 Vérification Email</h1>
          <p>Mon Toit - Plateforme Immobilière</p>
        </div>
        <div class="content">
          <h2>Bonjour ${data.name || 'utilisateur'} !</h2>
          <p>Merci de vous être inscrit sur Mon Toit. Pour finaliser votre inscription, veuillez vérifier votre adresse email en utilisant le code ci-dessous :</p>
          <div class="otp-code">${data.otp}</div>
          <p style="text-align: center; color: #6b7280;">
            <strong>Ce code expire dans ${data.expiresIn || '10 minutes'}</strong>
          </p>
          <div class="warning">
            <p style="margin: 0;"><strong>⚠️ Important :</strong></p>
            <ul style="margin: 10px 0 0 0; padding-left: 20px;">
              <li>Ne partagez jamais ce code avec qui que ce soit</li>
              <li>Mon Toit ne vous demandera jamais ce code par téléphone</li>
              <li>Ce code est à usage unique</li>
            </ul>
          </div>
          <p>Si vous n'avez pas créé de compte, ignorez simplement cet email.</p>
        </div>
        <div class="footer">
          <p>© 2025 Mon Toit - Tous droits réservés</p>
          <p>Ce message a été envoyé à ${data.email || data.to}</p>
        </div>
      </body>
      </html>
    `
  },

  'welcome': {
    subject: 'Bienvenue sur Mon Toit',
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #f97316, #ea580c); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏠 Mon Toit</h1>
          <p>Plateforme immobilière certifiée ANSUT</p>
        </div>
        <div class="content">
          <h2>Bienvenue ${data.name || ''} !</h2>
          <p>Merci de vous être inscrit sur Mon Toit, la plateforme immobilière certifiée ANSUT de Côte d'Ivoire.</p>
          <p>Vous pouvez maintenant :</p>
          <ul>
            <li>Rechercher des propriétés vérifiées</li>
            <li>Planifier des visites</li>
            <li>Signer des contrats électroniquement</li>
            <li>Effectuer des paiements sécurisés</li>
          </ul>
          <a href="${data.dashboardUrl || 'https://montoit.ansut.ci'}" class="button">Accéder à mon tableau de bord</a>
        </div>
        <div class="footer">
          <p>© 2025 Mon Toit - ANSUT Certifié</p>
          <p>Ce message a été envoyé à ${data.email || data.to}</p>
        </div>
      </body>
      </html>
    `
  },

  'password-reset': {
    subject: 'Réinitialisation de votre mot de passe - Mon Toit',
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #f97316, #ea580c); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: linear-gradient(135deg, #f97316, #ea580c); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔑 Réinitialisation du mot de passe</h1>
          <p>Mon Toit - Plateforme Immobilière</p>
        </div>
        <div class="content">
          <h2>Bonjour !</h2>
          <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte Mon Toit.</p>
          <div style="text-align: center;">
            <a href="${data.resetLink}" class="button">Réinitialiser mon mot de passe</a>
          </div>
          <p style="text-align: center; color: #6b7280; margin-top: 20px;">
            <strong>Ce lien est valide pendant 30 minutes</strong>
          </p>
          <div class="warning">
            <p style="margin: 0;"><strong>⚠️ Important :</strong></p>
            <ul style="margin: 10px 0 0 0; padding-left: 20px;">
              <li>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email</li>
              <li>Ne partagez jamais ce lien avec qui que ce soit</li>
            </ul>
          </div>
        </div>
        <div class="footer">
          <p>© 2025 Mon Toit - Tous droits réservés</p>
          <p>Ce message a été envoyé à ${data.email || data.to}</p>
        </div>
      </body>
      </html>
    `
  },

  'test': {
    subject: 'Email de test - Mon Toit',
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .box { background: #f97316; color: white; padding: 30px; border-radius: 10px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="box">
          <h1>✅ Email de test réussi !</h1>
          <p>L'envoi d'emails via Resend fonctionne correctement.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Message:</strong> ${data.message || 'Pas de message personnalisé'}</p>
        </div>
        <p style="text-align: center; color: #6b7280; margin-top: 20px;">
          © 2025 Mon Toit - Tous droits réservés
        </p>
      </body>
      </html>
    `
  }
};

/**
 * Envoie un email via l'API Resend
 * @param {string} to - Destinataire
 * @param {string} template - Nom du template
 * @param {object} data - Données pour le template
 */
async function sendEmail(to, template, data = {}) {
  // Validation des paramètres
  if (!to || !template) {
    console.error('❌ Erreur: Paramètres manquants');
    console.log('Usage: node send-email-resend.js <to> <template> [data_json]');
    console.log('\nTemplates disponibles:', Object.keys(emailTemplates).join(', '));
    process.exit(1);
  }

  // Vérifier que le template existe
  const emailTemplate = emailTemplates[template];
  if (!emailTemplate) {
    console.error(`❌ Erreur: Template "${template}" introuvable`);
    console.log('Templates disponibles:', Object.keys(emailTemplates).join(', '));
    process.exit(1);
  }

  // Préparer les données
  const templateData = { ...data, to, email: to };

  // Préparer le payload pour Resend
  const payload = {
    from: RESEND_FROM_EMAIL,
    to: Array.isArray(to) ? to : [to],
    subject: emailTemplate.subject,
    html: emailTemplate.html(templateData),
    tags: [
      { name: 'category', value: 'mon-toit' },
      { name: 'template', value: template }
    ]
  };

  console.log('\n📧 Envoi d\'email via Resend...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`De:     ${RESEND_FROM_EMAIL}`);
  console.log(`À:      ${to}`);
  console.log(`Template: ${template}`);
  console.log(`Sujet:  ${emailTemplate.subject}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Erreur lors de l\'envoi de l\'email');
      console.error('Status:', response.status);
      console.error('Détail:', result);
      process.exit(1);
    }

    console.log('✅ Email envoyé avec succès !');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`ID:       ${result.id}`);
    console.log(`De:       ${RESEND_FROM_EMAIL}`);
    console.log(`À:        ${to}`);
    console.log(`Template: ${template}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return result;
  } catch (error) {
    console.error('❌ Erreur réseau:', error.message);
    process.exit(1);
  }
}

// Parser les arguments CLI
const args = process.argv.slice(2);
const [to, template, dataJson] = args;

// Parser les données JSON si fournies
let data = {};
if (dataJson) {
  try {
    data = JSON.parse(dataJson);
  } catch (e) {
    console.error('❌ Erreur: Le paramètre data doit être un JSON valide');
    console.log('Exemple: \'{"name":"Jean","otp":"123456"}\'');
    process.exit(1);
  }
}

// Exécuter l'envoi
sendEmail(to, template, data);
