# 👥 ACTEURS & MATRICE DES PERMISSIONS — Mon Toit CI

**Source** : analyse-acteurs/, code (auth-store.ts, middleware.ts, sidebar.tsx, routes API), analyses 1-b/1-c/1-d.
**Rôles DB** : `LOCATAIRE | PROPRIETAIRE | AGENCE | TIERS_CONFIANCE | ADMIN` (+ rôle implicite **VISITEUR** non authentifié).

## 1. Définition des acteurs

| Acteur | Mission | Composants UI dédiés | Spécificités |
|---|---|---|---|
| 👤 **LOCATAIRE** | Chercher, se qualifier (dossier validé TC), visiter, signer, payer, habiter, sortir | 25 sections (dashboard/locataire) | Seul acteur avec parcours dossier→candidature→bail complet ; multi-dossiers ❌ (v1 unique) |
| 🏠 **PROPRIETAIRE** | Publier des biens, gérer dossiers/visites/baux/paiements, mandats agence | 21 sections (dashboard/proprietaire) | Peut créer mandats et déléguer à une agence ; finances & analytics existants mais absents de la sidebar |
| 🏢 **AGENCE** | Gérer le portefeuille pour compte de propriétaires (mandats) | 14 sections (dashboard/agence) | ⚠️ `agency_agents` sans user_id → agents de terrain non connectables ; commissions auto à l'activation du bail |
| 🛡️ **TIERS_CONFIANCE (TC)** | Valider dossiers locataires/propriétaires, certifications, état des lieux, litiges | 28 sections (dashboard/tc) | Acteur le plus riche ; SLA contraints ; ⚠️ agents de terrain SANS compte (contourné par SMS/email ANSUT) |
| ⚙️ **ADMIN** | Supervision globale, modération, gestion comptes TC, configuration, audit | 15 sections (dashboard/admin) | Jamais proposé à l'inscription (✅) mais ⚠️ escalade possible via API (cf. sécurité) |
| 👁️ **VISITEUR** | Consulter biens publics, CGU, contact, S'inscrire | home/ (19), auth/ (5) | Lecture publique `/api/properties` + reviews ; inscription rôle ∈ {LOCATAIRE, PROPRIETAIRE, AGENCE, TIERS_CONFIANCE} |

**Switch de rôle** : restreint à `LOCATAIRE ↔ PROPRIETAIRE` (onboarding-modal, `canSwitchRole`) via `/api/user/switch-role`.

## 2. Matrice des permissions (acteur × action × ressource)

Légende : ✅ autorisé · ❌ interdit · 👁️ lecture publique · ⚠️ à durcir (voir 1-c)

| Ressource / Action | VISITEUR | LOCATAIRE | PROPRIETAIRE | AGENCE | TC | ADMIN |
|---|---|---|---|---|---|---|
| Biens (liste/détail ACTIVE) | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ |
| Biens (CRUD propres) | ❌ | ❌ | ✅ | ✅ (via mandat) | ❌ | ✅ |
| Dossier locatif (CRUD own) | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Dossier locatif (validation) | ❌ | ❌ | 👁️ (statut) | ❌ | ✅ | ✅ |
| Dossier propriétaire (validation) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Candidatures (créer) | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Candidatures (valider/refuser) | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| Visites (demander) | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Visites (accepter/planifier) | ❌ | ❌ | ✅ | ✅ | ✅ (état des lieux) | ❌ |
| Baux (créer) | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| Baux (signer OTP) | ❌ | ✅ (own) | ✅ (own) | ✅ (délégation) | ❌ | ❌ |
| Paiements (initier mobile money) | ❌ | ✅ (own) | ❌ | ❌ | ❌ | ❌ |
| Paiements (consulter) | ❌ | ✅ (own) | ✅ (ses biens) | ✅ (portefeuille) | ❌ | ✅ |
| Transferts de fonds | ❌ | ❌ | ✅ ⚠️ (plafond manquant) | ❌ | ❌ | ✅ |
| Maintenance (créer) | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Maintenance (assigner) | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| Litiges (ouvrir) | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Litiges (médiation) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Mandats (créer/signer) | ❌ | ❌ | ✅ | ✅ (contre-signer) | ❌ | ✅ |
| Missions TC / certifications | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Messagerie | ❌ | ✅ (parties liées) | ✅ (parties liées) | ✅ | ✅ | ✅ |
| Avis / notation croisée | 👁️ | ✅ (sur bail) | ✅ (sur bail) | ❌ | ❌ | ✅ (modération) |
| Comptes TC | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Utilisateurs (gestion) | ❌ | ✅ (profil own) | ✅ (profil own) | ✅ (profil own) | ✅ (profil own) | ✅ |
| Configuration / feature flags / logs | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| KYC (soumettre) | ❌ | ✅ | ✅ | ✅ | ✅ (historiser) | ✅ |

## 3. Interfaces dédiées (répartition réelle du code)

```
src/components/dashboard/ (110 fichiers)
├── locataire/    25   ← sidebar 12 items : overview, favoris, candidatures, visites,
├── tc/           28   │   locations, états des lieux, paiements, messages, litiges,
├── proprietaire/ 21   │   notifications, paramètres (+ maintenance, avis, trust-score)
├── admin/        15
├── agence/       14
└── shared/        2   ⚠️ seuls 2 composants mutualisés (règle de séparation ~90% respectée)
```

## 4. Risques transverses par acteur (issus audit 1-c/1-e)
1. 🔴 **Escalade ADMIN** : `/api/auth/register` accepte `role` du body sans whitelist côté serveur.
2. 🔴 **Usurpation d'identité** : fallback `getSession()` dans `resolveRequestUser` sans vérification cryptographique → 146 routes impactées.
3. 🔴 **Paiement fail-open** : webhook Intouch sans secret obligatoire → validation de loyers fictifs.
4. 🟠 Composants `shared/` quasi vides + 4 imports croisés inter-acteurs (cf. rapport 1-d, écart E1).
5. 🟠 Agents (agence/TC) sans comptes → opérations déléguées hors traçabilité utilisateur.
