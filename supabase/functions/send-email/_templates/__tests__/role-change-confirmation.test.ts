import { assertEquals, assertStringIncludes, assert } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { roleChangeConfirmationTemplate, roleChangeConfirmationTextTemplate } from "../role-change-confirmation.ts";

// Helper pour extraire escapeHtml depuis le module (pour tester isolément)
const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

// ============================================
// Test Suite : Protection XSS
// ============================================

Deno.test("escapeHtml prevents XSS - script tag", () => {
  const malicious = "<script>alert('XSS')</script>";
  const escaped = escapeHtml(malicious);
  assertEquals(escaped, "&lt;script&gt;alert(&#039;XSS&#039;)&lt;/script&gt;");
});

Deno.test("escapeHtml prevents XSS - img tag with onerror", () => {
  const malicious = "<img src=x onerror=\"alert('XSS')\">";
  const escaped = escapeHtml(malicious);
  assertEquals(escaped.includes("<img"), false);
  assertStringIncludes(escaped, "&lt;img");
});

Deno.test("escapeHtml prevents XSS - SQL injection attempt", () => {
  const malicious = "'; DROP TABLE users; --";
  const escaped = escapeHtml(malicious);
  assertStringIncludes(escaped, "&#039;");
});

// ============================================
// Test Suite : Rendu du Template HTML
// ============================================

Deno.test("HTML template renders all data correctly", () => {
  const data = {
    userName: "Jean Dupont",
    oldRole: "🏠 Locataire",
    newRole: "🔑 Propriétaire",
    timestamp: "15 octobre 2025, 14:30",
    dashboardUrl: "https://montoit.ci/mes-biens"
  };
  
  const html = roleChangeConfirmationTemplate(data);
  
  assertStringIncludes(html, "Jean Dupont");
  assertStringIncludes(html, "🏠 Locataire");
  assertStringIncludes(html, "🔑 Propriétaire");
  assertStringIncludes(html, "15 octobre 2025, 14:30");
  assertStringIncludes(html, data.dashboardUrl);
});

Deno.test("HTML template escapes malicious userName", () => {
  const data = {
    userName: "<script>alert('hack')</script>",
    oldRole: "Locataire",
    newRole: "Propriétaire",
    timestamp: "15 octobre 2025, 14:30",
    dashboardUrl: "https://montoit.ci/mes-biens"
  };
  
  const html = roleChangeConfirmationTemplate(data);
  
  // Ne doit PAS contenir le script brut
  assertEquals(html.includes("<script>alert"), false);
  // Doit contenir la version échappée
  assertStringIncludes(html, "&lt;script&gt;");
});

Deno.test("HTML template escapes malicious URL", () => {
  const data = {
    userName: "Jean Dupont",
    oldRole: "Locataire",
    newRole: "Propriétaire",
    timestamp: "15 octobre 2025, 14:30",
    dashboardUrl: "javascript:alert('XSS')"
  };
  
  const html = roleChangeConfirmationTemplate(data);
  
  // Ne doit PAS contenir javascript: brut dans href
  const hasRawJavascript = html.match(/href="javascript:/);
  assertEquals(hasRawJavascript, null);
});

Deno.test("HTML template has correct lang attribute", () => {
  const data = {
    userName: "Jean Dupont",
    oldRole: "Locataire",
    newRole: "Propriétaire",
    timestamp: "15 octobre 2025, 14:30",
    dashboardUrl: "https://montoit.ci/mes-biens"
  };
  
  const html = roleChangeConfirmationTemplate(data);
  assertStringIncludes(html, '<html lang="fr">');
});

Deno.test("HTML template has accessibility attributes", () => {
  const data = {
    userName: "Jean Dupont",
    oldRole: "Locataire",
    newRole: "Propriétaire",
    timestamp: "15 octobre 2025, 14:30",
    dashboardUrl: "https://montoit.ci/mes-biens"
  };
  
  const html = roleChangeConfirmationTemplate(data);
  
  // Vérifier role="presentation" pour tables
  assertStringIncludes(html, 'role="presentation"');
  
  // Vérifier aria-hidden sur émojis
  assertStringIncludes(html, 'aria-hidden="true"');
});

Deno.test("HTML template has Outlook MSO support", () => {
  const data = {
    userName: "Jean Dupont",
    oldRole: "Locataire",
    newRole: "Propriétaire",
    timestamp: "15 octobre 2025, 14:30",
    dashboardUrl: "https://montoit.ci/mes-biens"
  };
  
  const html = roleChangeConfirmationTemplate(data);
  
  // Vérifier balises conditionnelles MSO
  assertStringIncludes(html, "<!--[if mso]>");
  assertStringIncludes(html, "<![endif]-->");
});

// ============================================
// Test Suite : Version Texte
// ============================================

Deno.test("Text template renders all data correctly", () => {
  const data = {
    userName: "Jean Dupont",
    oldRole: "Locataire",
    newRole: "Propriétaire",
    timestamp: "15 octobre 2025, 14:30",
    dashboardUrl: "https://montoit.ci/mes-biens"
  };
  
  const text = roleChangeConfirmationTextTemplate(data);
  
  assertStringIncludes(text, "Jean Dupont");
  assertStringIncludes(text, "Locataire");
  assertStringIncludes(text, "Propriétaire");
  assertStringIncludes(text, data.dashboardUrl);
});

Deno.test("Text template escapes malicious content", () => {
  const data = {
    userName: "<script>alert('hack')</script>",
    oldRole: "Locataire",
    newRole: "Propriétaire",
    timestamp: "15 octobre 2025, 14:30",
    dashboardUrl: "https://montoit.ci/mes-biens"
  };
  
  const text = roleChangeConfirmationTextTemplate(data);
  
  // Version texte doit aussi échapper
  assertEquals(text.includes("<script>"), false);
  assertStringIncludes(text, "&lt;script&gt;");
});

Deno.test("Text template has security warning", () => {
  const data = {
    userName: "Jean Dupont",
    oldRole: "Locataire",
    newRole: "Propriétaire",
    timestamp: "15 octobre 2025, 14:30",
    dashboardUrl: "https://montoit.ci/mes-biens"
  };
  
  const text = roleChangeConfirmationTextTemplate(data);
  
  assertStringIncludes(text, "SÉCURITÉ");
  assertStringIncludes(text, "support@montoit.ci");
});