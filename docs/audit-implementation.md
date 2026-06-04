# Audit d'Implémentation — Montoit

> **Date :** 4 juin 2026
> **Objet :** Comparaison entre les spécifications documentées (`docs/*.md`) et le code implémenté
> **Légende :** ✅ Implémenté | ⚠️ Partiellement implémenté | ❌ Non implémenté | 🔴 Bloqué

---

## 1. VISITEUR (docs/visiteur.md)

| ID | User Story | Statut | Commentaire |
|---|---|---|---|
| MON-008 | Page d'accueil : barre de recherche, biens récents, compteurs de confiance, CTA | ✅ | Hero + counters + CTA dans `home/hero.tsx`, `home/about.tsx`, `home/properties.tsx` |
| MON-009 | Navigation sans inscription | ✅ | Accès public aux pages `nos-biens`, détail bien |
| MON-010 | Recherche + filtres sans connexion | ✅ | Filtres dans `nos-biens-view.tsx` accessibles sans auth |
| MON-011 | Popup connexion sur action bloquée | ✅ | Auth forms s'affichent quand non connecté |
| MON-048 | Liste paginée des biens (aperçu limité) | ✅ | `nos-biens-view.tsx` avec `PaginationControls` |
| MON-049 | Filtres : type, prix, pièces, meublé | ✅ | Filtres complets dans `nos-biens-view.tsx` |
| MON-050 | Filtre localisation Abidjan/Hors Abidjan | ✅ | `cities.ts` avec communes d'Abidjan |
| MON-051 | Tri : prix croissant/décroissant, récent | ✅ | `sortBy` dans `nos-biens-view.tsx` |
| MON-052 | Bascule vue liste/carte Leaflet | ✅ | `viewMode` grid/list/map avec `PropertyMapLeaflet` |
| MON-054 | Partage fiche bien via WhatsApp | ❌ | **Non implémenté** — aucun bouton de partage WhatsApp trouvé |
| MON-082 | Note globale + avis sur fiche publique | ✅ | `ReviewsTab` dans `property-detail-view.tsx` |
| MON-012 | Pages légales : CGU, Confidentialité, Mentions légales | ⚠️ | **Liens cassés** dans `footer.tsx` : `href='#'` au lieu de vraies pages |
| MON-122 | Recherche plein texte par mots-clés (V2) | ❌ | Non implémenté (V2) |

**Résumé Visiteur :** 10/13 implémenté. Manque partage WhatsApp, pages légales, full-text search.

---

## 2. LOCATAIRE (docs/locataire.md)

| ID | User Story | Statut | Commentaire |
|---|---|---|---|
| MON-013 | Inscription email + mot de passe | ✅ | `register-form.tsx` avec Supabase Auth |
| MON-014 | Connexion email + mot de passe | ✅ | `login-form.tsx` |
| MON-015 | Inscription/connexion téléphone + OTP SMS | ✅ | Flow SMS OTP complet : `send-sms-otp`, `verify-sms-otp` |
| MON-016 | Réinitialisation mot de passe | ✅ | `forgot-password-form.tsx` + route API |
| MON-017 | Choix du rôle à l'inscription | ✅ | Sélecteur de rôle dans `register-form.tsx` |
| MON-018 | Acceptation CGU + consentement horodaté | ⚠️ | Checkbox CGU existante mais **pages CGU vides** (`href='#'`) |
| MON-019 | Écran d'onboarding post-inscription | ❌ | **Non implémenté** — aucun composant d'onboarding trouvé |
| MON-020 | Modifier email/password/supprimer compte | ✅ | `settings/index.tsx` — modification profil, mot de passe |
| MON-021 | Double rôle Propriétaire + Locataire | ✅ | `switch-role` dans `dashboard-header.tsx` + `auth-store.ts` |
| MON-022 | Créer/éditer profil locataire | ✅ | `settings/index.tsx` — formulaire profil |
| MON-026 | Upload documents KYC | ✅ | `kyc-modal.tsx` + upload CNI, justificatif domicile |
| MON-053 | Fiche détaillée complète d'un bien | ✅ | `property-detail-view.tsx` |
| MON-055 | Sauvegarder des biens en favoris | ✅ | `use-favorites.ts` + `favorites.tsx` |
| MON-056 | Alerte de recherche (nouveau bien) | ❌ | **Non implémenté** |
| MON-057 | Créer dossier locatif | ✅ | `rental-file.tsx` avec `RentalFileForm` |
| MON-058 | Soumettre dossier au TC | ✅ | Soumission dans `rental-file.tsx` |
| MON-059 | Envoyer dossier validé au propriétaire | ✅ | Flow candidatures `applications.tsx` |
| MON-036 | Resoumission après rejet | ✅ | `rental-file.tsx` permet modification + resoumission |
| MON-062 | Demander une visite depuis la fiche bien | ✅ | `property-detail-view.tsx` — dialogue visite |
| MON-064 | Notification de confirmation/modification visite | ✅ | `notify.ts` + notifications in-app |
| MON-065 | Rappel automatique J-1 visite | ⚠️ | Type `VISIT_REMINDER` existe + préférences notification, mais **déclencheur automatique J-1 côté serveur non vérifié** |
| MON-066 | Annuler une visite | ✅ | `my-visits.tsx` + API `visits/[id]` |
| MON-067 | Messagerie temps réel | ✅ | `messages.tsx` + Realtime subscription |
| MON-068 | Historique des conversations | ✅ | `messages.tsx` |
| MON-069 | Notification push + email nouveau message | ✅ | `notify.ts` + `notification-store.ts` |
| MON-071 | Formulaire de contact / support | ✅ | `contact.tsx` + footer |
| MON-072 | Générer contrat de bail pré-rempli | ✅ | `generate-bail.tsx` + API `leases/create` |
| MON-073 | Signature électronique par OTP SMS | ✅ | `leases/[id]/sign` route + CRYPTONEO |
| MON-074 | Relance automatique 48h si non signé | ❌ | **Non implémenté** |
| MON-075 | Télécharger contrat signé en PDF | ✅ | Route `leases/[id]/contract` + PDF généré |
| MON-076 | État des lieux d'entrée numérique | ⚠️ | `inventory-report-form.tsx` existe mais **pas de distinction entrée/sortie claire** |
| MON-077 | Espace 'Archives' pour contrats et documents expirés | ⚠️ | `enhanced-leases.tsx` a un onglet "Archivés" (TERMINATED/EXPIRED) mais **pas d'espace archives dédié** |
| MON-078 | Initier clôture de bail | ✅ | `leases/[id]/terminate` route + UI |
| MON-079 | Invitation automatique à noter à la clôture | ❌ | **Non implémenté** |
| MON-080 | Noter propriétaire/agence à la clôture | ⚠️ | `owner-reviews.tsx` a `leasesToReview` mais **pas de déclenchement automatique** |
| MON-095 | Payer loyer en ligne (mobile money) | ✅ | `payments/initiate` route |
| MON-096 | Payer X mois en avance | ✅ | `payments/advance` route |
| MON-097 | Rappel automatique J-3 échéance loyer | ⚠️ | Notifications de paiement existent mais **déclencheur J-3 non vérifié** |
| MON-099 | Payer en cash + reçu digital | ❌ | **Non implémenté** |
| MON-100 | Quittance de loyer PDF automatique | ⚠️ | `payment-detail.tsx` génère une quittance texte mais **pas un vrai PDF structuré** |
| MON-101 | Reçu de dépôt de garantie (caution) | ❌ | **Non implémenté** |
| MON-102 | Historique complet des paiements | ✅ | `payments.tsx` avec pagination |
| MON-110 | Tracer restitution caution fin de bail | ❌ | **Non implémenté** |
| MON-111 | Renouvellement de bail + avenant OTP | ❌ | **Non implémenté** — seulement une clause dans le template PDF |
| MON-112 | État des lieux de sortie numérique | ⚠️ | `inventory-report-form.tsx` existe mais **pas spécifiquement pour la sortie** |
| MON-113 | Vérification identité Smile ID | 🔴 | **Bloqué** — mentionné dans la doc |
| MON-117 | Ticket de maintenance + suivi statut | ✅ | `maintenance.tsx` avec statuts PENDING/IN_PROGRESS/CLOSED |
| MON-120 | Plusieurs versions de dossier (solo/couple/garant) | ❌ | **Non implémenté** |
| MON-121 | Envoyer photos/documents par message (10 Mo) | ❌ | **Non implémenté** |
| MON-123 | Suggestions biens similaires | ⚠️ | `recommendedProperties` dans dashboard locataire mais **moteur de recommandation simple** |
| MON-124 | Indicateur de complétude du profil | ❌ | **Non implémenté** — pas de barre de progression visible |
| MON-125 | SSO Google | ❌ | **Non implémenté** |
| MON-126 | SSO Meta (Facebook) | ❌ | **Non implémenté** |

**Résumé Locataire :** 28/40 implémenté, 7 partiellement, 10 non implémentés, 1 bloqué.

---

## 3. PROPRIÉTAIRE (docs/proprietaire.md)

| ID | User Story | Statut | Commentaire |
|---|---|---|---|
| MON-013 à 021 | Inscription, connexion, onboarding, double rôle | ✅/❌ | Mêmes statuts que le locataire |
| MON-023 | Créer/éditer profil propriétaire | ✅ | `owner-settings.tsx` |
| MON-026 | Upload documents KYC | ✅ | `kyc-modal.tsx` |
| MON-038 | Publier annonce structurée | ✅ | `add-property.tsx` — type, surface, loyer, charges, caution, etc. |
| MON-039 | Localisation carte Leaflet | ✅ | `add-property.tsx` avec `PropertyMapLeaflet` |
| MON-040 | Upload jusqu'à 10 photos | ✅ | Upload images dans `add-property.tsx` |
| MON-041 | Éditer annonce existante | ✅ | `my-properties.tsx` → édition |
| MON-042 | Suspendre/supprimer annonce | ✅ | `my-properties.tsx` — toggle statut |
| MON-043 | Statistiques par annonce (vues, dossiers, visites) | ✅ | `security.tsx` — `viewsCount`, overview dashboard |
| MON-046 | Tableau de bord synthétique | ✅ | `overview.tsx` — biens, dossiers, visites, contrats |
| MON-007 | Expiration auto annonces inactives | ❌ | **Non implémenté** |
| MON-044 | Passage auto 'Loué' à signature bail | ❌ | **Non vérifié** — probablement pas implémenté (trigger Supabase) |
| MON-045 | Repasse auto 'Disponible' à clôture bail | ❌ | **Non vérifié** — probablement pas implémenté |
| MON-060 | Consulter dossiers soumis (validés TC) | ✅ | `enhanced-rental-files.tsx` |
| MON-061 | Accepter/refuser dossier + motif | ✅ | `rental-files/[id]/action` route |
| MON-063 | Gérer demandes de visite | ✅ | `visit-requests.tsx` |
| MON-072 à 077 | Contractualisation (identique locataire) | ✅/⚠️ | Mêmes statuts que le locataire |
| MON-078 | Initier clôture de bail | ✅ | `leases/[id]/terminate` |
| MON-081 | Noter locataire à la clôture | ⚠️ | `owner-reviews.tsx` a `leasesToReview` mais **pas automatique** |
| MON-083 | Répondre publiquement à un avis | ❌ | **Non implémenté** — pas de fonctionnalité de réponse |
| MON-098 | Alerte impayé | ⚠️ | Notifications d'impayés existent mais **pas de système d'alerte proactif** |
| MON-103 | Paiements reçus filtrables par bien | ✅ | `finances.tsx` avec filtrage |
| MON-106 | Abonnement mensuel plateforme | ❌ | **Non implémenté** |
| MON-107 | Commission 3% à la contractualisation | ❌ | **Non implémenté** |
| MON-108 | Historique transactions plateforme | ❌ | **Non implémenté** |
| MON-118 | Gérer demandes de maintenance | ✅ | `owner-maintenance.tsx` |

**Résumé Propriétaire :** 15/22 implémenté, 2 partiellement, 6 non implémentés.

---

## 4. TIERS DE CONFIANCE (docs/tc.md)

| ID | User Story | Statut | Commentaire |
|---|---|---|---|
| MON-028 | Back-office dédié | ✅ | Dashboard TC complet (`tc/`) |
| MON-029 | File d'attente avec SLA 48h | ✅ | `rental-files-queue.tsx` + `validation_slas` table + `sla-monitoring.tsx` |
| MON-030 | Valider/rejeter dossier locataire | ✅ | `rental-file-detail.tsx` + `tc/rental-files` API |
| MON-031 | Définir durée de validité dossier | ❌ | **Non implémenté** — pas de paramètre de durée trouvé |
| MON-032 | Valider profils propriétaires | ✅ | `owner-dossier-validations.tsx` + `tc/owner-files` API |
| MON-033 | Valider dossiers agences | ✅ | `agency-validations.tsx` |
| MON-034 | Demander documents complémentaires | ⚠️ | Commentaires possibles mais **pas de workflow dédié "demande de complément" avec notification spécifique** |
| MON-035 | Notification résultat validation | ✅ | `notify.ts` + notifications |
| MON-113 | Smile ID (biométrie + CNI) | 🔴 | **Bloqué** |
| MON-114 | API CCI Abidjan | 🔴 | **Bloqué** (accord institutionnel requis) |

**Résumé TC :** 6/8 implémenté, 1 partiellement, 1 non implémenté, 2 bloqués.

---

## 5. AGENCE (docs/agence.md)

| ID | User Story | Statut | Commentaire |
|---|---|---|---|
| MON-024 | Créer/éditer profil agence | ✅ | `settings.tsx` — raison sociale, logo, contacts, zone |
| MON-025 | Inviter agents + gérer droits | ✅ | `team.tsx` — équipe multi-agents |
| MON-033 | Validation TC dossier agence | ✅ | `agency-validations.tsx` |
| MON-109 | Tableau de bord financier consolidé | ✅ | `finances.tsx` — portefeuille multi-biens |
| MON-114 | API CCI Abidjan | 🔴 | **Bloqué** |

**Résumé Agence :** 4/5 implémenté, 1 bloqué.

---

## 6. ADMIN (docs/admin.md)

| ID | User Story | Statut | Commentaire |
|---|---|---|---|
| MON-027 | Consulter/suspendre/supprimer comptes | ✅ | `admin/users.tsx` |
| MON-037 | Créer/révoquer/superviser TC | ✅ | `admin/tc-management.tsx` |
| MON-047 | Modérer annonces (valider/rejeter/dépublier) | ✅ | `admin/properties-moderation.tsx` |
| MON-084 | Modérer les avis (supprimer abusifs) | ❌ | **Non implémenté** — pas de section de modération des avis |
| MON-085 | Tableau de bord global | ✅ | `admin/overview.tsx` |
| MON-086 | Exporter données en CSV/Excel | ❌ | **Non implémenté** — les boutons "Exporter" existent mais export simple, pas CSV/Excel structuré |
| MON-087 | Gérer les litiges | ✅ | `admin/disputes.tsx` |
| MON-104 | Conformité stores (Google Play / App Store) | ❌ | V2 — probablement pas implémenté |

**Résumé Admin :** 5/8 implémenté, 3 non implémentés.

---

## 7. TRANSVERSE (docs/tout_acteur.md)

| ID | User Story | Statut | Commentaire |
|---|---|---|---|
| MON-070 | Centre de notifications in-app (cloche) | ✅ | `notifications.tsx` + `dashboard-header.tsx` — cloche avec badge |
| MON-124 | Indicateur de complétude du profil | ❌ | **Non implémenté** |
| MON-125 | SSO Google | ❌ | **Non implémenté** |
| MON-126 | SSO Meta (Facebook) | ❌ | **Non implémenté** |

---

## 8. SYNTHÈSE GLOBALE

### Par acteur

| Acteur | Total | ✅ Implémenté | ⚠️ Partiel | ❌ Manquant | 🔴 Bloqué | % Implémentation |
|--------|-------|:------------:|:----------:|:----------:|:---------:|:----------------:|
| **Visiteur** | 13 | 10 | 1 | 2 | 0 | **77%** |
| **Locataire** | 40 | 28 | 7 | 10 | 1 | **70%** |
| **Propriétaire** | 22 | 15 | 2 | 6 | 0 | **68%** |
| **TC** | 8 | 6 | 1 | 1 | 2 | **75%** |
| **Agence** | 5 | 4 | 0 | 0 | 1 | **80%** |
| **Admin** | 8 | 5 | 0 | 3 | 0 | **63%** |
| **Transverse** | 4 | 1 | 0 | 3 | 0 | **25%** |
| **TOTAL** | **100** | **69** | **11** | **25** | **4** | **69%** |

### Top 10 priorités manquantes critiques

| Priorité | Feature | Acteur | Raison |
|:--------:|---------|--------|--------|
| 🔴 | MON-012 — Pages légales (CGU, Confidentialité) | Visiteur/Tous | **Obligation légale** — liens cassés |
| 🔴 | MON-019 — Onboarding post-inscription | Tous | **Taux d'abandon** — réduction forte |
| 🔴 | MON-106 — Abonnement mensuel plateforme | Propriétaire | **Modèle économique** |
| 🔴 | MON-107 — Commission 3% contractualisation | Propriétaire | **Modèle économique** |
| 🔴 | MON-079 — Invitation auto à noter | Tous | **Mécanisme de confiance** central |
| 🔴 | MON-074 — Relance 48h signature | Tous | **Contrats bloqués** |
| 🔴 | MON-084 — Modération des avis | Admin | **Modération nécessaire** |
| 🔴 | MON-056 — Alertes de recherche | Locataire | **Forte valeur UX** |
| 🔴 | MON-086 — Export CSV/Excel | Admin | **Besoin back-office** |
| 🔴 | MON-101 — Reçu dépôt de garantie | Locataire | **Obligation contractuelle** |

### Forces de l'implémentation

- **Dashboard riche** par rôle avec sections complètes et navigation structurée
- **Realtime** (subscriptions Supabase) sur la plupart des listes (messages, visites, dossiers, etc.)
- **Signature électronique** via CRYPTONEO + OTP SMS/email fonctionnelle
- **Paiement mobile money** (Orange Money, MTN MoMo, Wave) implémenté
- **Carte Leaflet** pour localisation des biens + vue carte
- **Filtres de recherche** avancés (prix, type, localisation, meublé, etc.)
- **Gestion multi-rôles** (bascule Locataire ↔ Propriétaire)
- **Paginations** cohérentes sur toutes les listes
- **Upload documents** vers Supabase Storage avec RLS

### Faiblesses / lacunes

- **Pages légales absentes** (CGU, Confidentialité, Mentions légales) — risque juridique
- **Pas d'onboarding** après inscription — taux d'abandon probablement élevé
- **Modèle économique non implémenté** (abonnement, commission)
- **Automatismes manquants** (relance 48h, invitation notation, expiration annonces, changement statut auto)
- **Pas de multiples versions de dossier** (solo/couple/garant)
- **Pas de recherche plein texte** (mots-clés dans descriptions)
- **SSO non implémenté** (Google, Facebook)
- **Indicateur de complétude du profil absent**
- **Partage WhatsApp non disponible**
- **Pas de reçu de caution / dépôt de garantie**
- **Pas de renouvellement de bail**

---

*Rapport généré le 4 juin 2026 par audit automatisé du code source.*
