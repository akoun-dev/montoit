# Signature électronique CRYPTONEO

## Architecture

```
┌─────────────┐     POST /api/leases/[id]/sign     ┌──────────────────┐
│   Frontend  │ ──────────────────────────────────→ │   Next.js Route  │
│   (React)   │ ←────────────────────────────────── │  (route.ts)      │
└─────────────┘         JSON response               └────────┬─────────┘
                                                              │ POST /functions/v1/sign
                                                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Supabase Edge Function                             │
│                         sign/index.ts                                   │
│                                                                         │
│  1. Résout l'alias (DB locale → CRYPTONEO → génération auto)           │
│  2. POST /sign/signFileBatch          → obtient operationId             │
│  3. POST /sign/verifySignedBatch      → polling jusqu'à fileName        │
│  4. GET  /sign/getSignedFile/{fileName} → télécharge PDF signé          │
│  5. Upload vers Supabase Storage (lease-documents)                      │
│  6. Retourne { operationId, signedFileName, contractUrl }               │
└────────────────────┬────────────────────────────────────────────────────┘
                     │ CRYPTONEO API (esignaturedemo)
                     ▼
┌──────────────────────────────────────────────────────┐
│           CRYPTONEO / ANSUT                           │
│  https://ansut.cryptoneoplatforms.com/esignaturedemo  │
│                                                       │
│  - /user/auth                   → JWT token           │
│  - /otp/send                    → Envoi OTP email     │
│  - /sign/signFileBatch          → Signer PDF          │
│  - /sign/verifySignedBatch      → Vérifier statut     │
│  - /sign/getSignedFile/{file}   → Télécharger signé   │
│  - /generateCert/users          → Lister certificats  │
└──────────────────────────────────────────────────────┘
```

## Prérequis

### Variables d'environnement

```env
# .env.local
CRYPTONEO_API_URL=https://ansut.cryptoneoplatforms.com/esignaturedemo
CRYPTONEO_APP_KEY=f1e12a-d652-a757-b968-4784-3b062142
CRYPTONEO_APP_SECRET=4a76-b456-c170-a774-410b-b0a5-9c67-b20c
```

Ces variables doivent être déployées comme **secrets** Supabase :

```bash
npx supabase secrets set CRYPTONEO_API_URL=...
npx supabase secrets set CRYPTONEO_APP_KEY=...
npx supabase secrets set CRYPTONEO_APP_SECRET=...
```

### Bucket Storage

Le bucket `lease-documents` doit autoriser `application/pdf` et `image/png` :

```json
{
  "public": true,
  "file_size_limit": 52428800,
  "allowed_mime_types": ["application/pdf", "image/png", "image/jpeg", "image/jpg"]
}
```

Une image transparente 1x1 est stockée dans le bucket pour `urlImage`/`hashImage` :
- URL : `/storage/v1/object/public/lease-documents/signature_transparent.png`
- SHA-256 : `cdb30873bdf16770bfea1fe86e44db7476e504c2dca1542b0660b20f47f523a7`

## Flow complet

### 1. Leasing status = PENDING_SIGNATURE

Le bail doit être en statut `PENDING_SIGNATURE` pour pouvoir être signé.

### 2. Envoi de l'OTP (frontend → API)

```
POST /api/leases/[id]/request-sign-otp
Body: { canal: "MAIL" }
```

Appelle l'edge function `sign-send-otp` qui :
1. Résout l'utilisateur (auth Supabase)
2. Récupère ou génère l'alias CRYPTONEO
3. Appelle CRYPTONEO `/otp/send` avec l'alias
4. Sauvegarde l'alias en base (`signature_aliases`)
5. Stocke le hash OTP en session pour vérification

### 3. Signature (frontend → API)

```
POST /api/leases/[id]/sign
Body: { otpCode: "123456", signatureImage: "data:image/..." }
```

#### 3a. Route Next.js (route.ts)

1. Vérifie l'authentification
2. Vérifie le statut du bail (PENDING_SIGNATURE)
3. Vérifie que l'utilisateur est propriétaire ou locataire et n'a pas déjà signé
4. Pour le **propriétaire** :
   - Télécharge le PDF depuis Storage
   - Calcule SHA-256 du PDF (`hashDoc`)
   - Calcule le SHA-256 de l'image de signature si fournie (`hashImage`)
   - Appelle l'edge function `sign` via `POST /functions/v1/sign`
5. Pour le **locataire** : signature simple sans CRYPTONEO

#### 3b. Edge Function sign

**Résolution de l'alias** :
1. Cherche dans `signature_aliases` (user_id, is_active)
2. Si pas trouvé, cherche dans CRYPTONEO `/generateCert/users` par email
3. Si trouvé sur CRYPTONEO, sauvegarde en base

**Appel CRYPTONEO** :
```json
{
  "aliasCertificat": "12GGE51LUCOSNTL",
  "otp": "34823",
  "callBackUrl": "https://partners.cryptoneoplatforms.com/electronicsignature/sign/callBack",
  "signRequest": [{
    "codeDoc": "bail_xxx_owner.pdf",
    "urlDoc": "https://.../bail_initial.pdf",
    "hashDoc": "134595401b36460d...",
    "visibiliteImage": false,
    "urlImage": "https://.../signature_transparent.png",
    "hashImage": "cdb30873bdf16770...",
    "positionImage": "0,0",
    "pageImage": "1",
    "messageImage": "false",
    "lieuSignature": "Abidjan",
    "motifSignature": "Signature PRENOM NOM"
  }]
}
```

**Étapes** :
1. POST `/sign/signFileBatch` → `{ operationId: 42, ... }`
2. POST `/sign/verifySignedBatch` (polling 30s, intervalle 2s) → `{ fileName: "...SIGNED-39.PDF" }`
3. GET `/sign/getSignedFile/...SIGNED-39.PDF` → buffer du PDF signé
4. Upload vers `lease-documents/signed/...` dans Supabase Storage
5. Retourne `{ operationId, signedFileName, contractUrl }`

#### 3c. Route Next.js (fin)

1. Met à jour le bail :
   - `owner_signed_at` ou `tenant_signed_at`
   - `cryptoneo_operation_id`
   - `contract_url` (URL publique du PDF signé)
   - Si les deux ont signé → status = `ACTIVE`
2. Génère la version finale du PDF (si les deux ont signé)
3. Notifie l'autre partie
4. Log d'audit

## Réponses CRYPTONEO

### Codes statut

| Code | Signification |
|------|---------------|
| 200 | Succès |
| 7000 | Liste d'utilisateurs |
| 7002 | OTP envoyé avec succès |
| 7003 | Signature réussie |
| 7004 | Vérification réussie |
| 8006 | Paramètres invalides |
| 8007 | Authentification échouée |
| 8012 | Session expirée |
| 9003 | Opération échouée |
| "500" | Erreur interne (ISE) |
| 0 | Erreur silencieuse (accepté mais non traité) |

### Champs obligatoires dans signRequest

Même avec `visibiliteImage: false`, ces champs sont requis :

| Champ | Valeur par défaut |
|-------|-------------------|
| `urlImage` | URL d'une image transparente 1x1 |
| `hashImage` | SHA-256 de l'image |
| `positionImage` | `"0,0"` |
| `pageImage` | `"1"` |
| `messageImage` | `"false"` |
| `hashDoc` | SHA-256 du PDF (obligatoire, ne peut être null) |

## Déploiement

```bash
# Edge functions
npx supabase functions deploy sign
npx supabase functions deploy sign-send-otp --no-verify-jwt
npx supabase functions deploy sign-verify --no-verify-jwt

# Vérifier les secrets
npx supabase secrets list | grep CRYPTONEO
```

## Dépannage

| Erreur | Cause | Solution |
|--------|-------|----------|
| `statusCode: 0, data: null` | Service "CLD PR" indisponible | Forcer `callBackUrl` vers `partners.cryptoneoplatforms.com` |
| `hashDoc: doit être fourni` | `hashDoc` manquant | Calculer SHA-256 côté route avant d'envoyer |
| `urlImage/hashImage: doit être fourni` | Champs image manquants | Ajouter valeurs par défaut (image transparente) |
| `Aucun certificat trouvé` | Alias pas en base | Vérifier `signature_aliases` ou recherche CRYPTONEO |
| `Maximum call stack size exceeded` | `crypto.subtle.digest` problématique | Calculer le hash côté Next.js, pas dans l'edge function |
| `Unauthorized` | Token invalide ou headers absents | Utiliser `Authorization: Bearer <token>` + `x-user-id` si service role |

## Environnements

- **Démo** : `https://ansut.cryptoneoplatforms.com/esignaturedemo` (auth, OTP, certificats OK — signature PDF limitée)
- **Production (partners)** : `https://partners.cryptoneoplatforms.com/electronicsignature` (signature complète — credentials séparés requis)

Le `callBackUrl` doit pointer vers `https://partners.cryptoneoplatforms.com/electronicsignature/sign/callBack` pour que `signFileBatch` retourne un `operationId`.
