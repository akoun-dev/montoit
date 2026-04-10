# Rapport - Système de Paiement INTOUCH

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Configuration](#configuration)
3. [Architecture](#architecture)
4. [Opérateurs supportés](#opérateurs-supportés)
5. [Flux de paiement](#flux-de-paiement)
6. [Paiements récurrents](#paiements-récurrents)
7. [Types et interfaces](#types-et-interfaces)
8. [Gestion des erreurs](#gestion-des-erreurs)
9. [Sécurité](#sécurité)
10. [Base de données](#base-de-données)

---

## Vue d'ensemble

Le système de paiement INTOUCH est une intégration Mobile Money pour la plateforme MonToit, permettant aux utilisateurs de payer leur loyer via les opérateurs Mobile Money de Côte d'Ivoire.

**Fichiers principaux :**

| Fichier                                            | Description                           |
| -------------------------------------------------- | ------------------------------------- |
| `src/services/payments/intouchPaymentService.ts`   | Service principal de paiement INTOUCH |
| `src/services/payments/recurringPaymentService.ts` | Gestion des paiements récurrents      |
| `src/types/payment.types.ts`                       | Types TypeScript pour les paiements   |
| `src/shared/config/api-keys.config.ts`             | Configuration des clés API            |

---

## Configuration

### Variables d'environnement

Le système nécessite les variables d'environnement suivantes dans le fichier `.env` :

```env
VITE_INTOUCH_BASE_URL=https://apidist.gutouch.net
VITE_INTOUCH_USERNAME=your_username
VITE_INTOUCH_PASSWORD=your_password
VITE_INTOUCH_PARTNER_ID=your_partner_id
VITE_INTOUCH_LOGIN_API=/login
VITE_INTOUCH_PASSWORD_API=/password
```

### Vérification de configuration

```typescript
// src/shared/config/api-keys.config.ts
readonly payment = {
  inTouch: {
    baseUrl: import.meta.env['VITE_INTOUCH_BASE_URL'] || 'https://apidist.gutouch.net',
    username: import.meta.env['VITE_INTOUCH_USERNAME'] || '',
    password: import.meta.env['VITE_INTOUCH_PASSWORD'] || '',
    partnerId: import.meta.env['VITE_INTOUCH_PARTNER_ID'] || '',
    isConfigured: !!(import.meta.env['VITE_INTOUCH_USERNAME'] && import.meta.env['VITE_INTOUCH_PASSWORD']),
  }
}
```

---

## Architecture

```
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│  Edge Function      │────▶│   INTOUCH API   │
│   (React)       │     │  (Supabase)         │     │                 │
└─────────────────┘     └─────────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │  Supabase DB │
                        └──────────────┘
```

### Pourquoi une Edge Function ?

L'utilisation d'une Edge Function Supabase comme proxy permet de :

- Éviter les problèmes CORS entre le navigateur et l'API INTOUCH
- Sécuriser les credentials API (jamais exposés côté client)
- Centraliser les logs et la gestion des erreurs
- Faciliter la maintenance des appels API

---

## Opérateurs supportés

Le système supporte les 4 principaux opérateurs Mobile Money de Côte d'Ivoire :

| Opérateur        | Code   | Préfixe | OTP requis | Frais (%) |
| ---------------- | ------ | ------- | ---------- | --------- |
| Orange Money     | `OM`   | `07`    | ✅ Oui     | 1.5%      |
| MTN Mobile Money | `MTN`  | `05`    | ❌ Non     | 1.5%      |
| Moov Money       | `MOOV` | `01`    | ❌ Non     | 1.2%      |
| Wave             | `WAVE` | `04`    | ❌ Non     | 1.0%      |

### Format des numéros

**Nouveau format Côte d'Ivoire (depuis 31/01/2021) : 10 chiffres**

```
Format: XX XX XX XX XX
Exemples:
  - 07 01 02 03 04 (Orange)
  - 05 01 02 03 04 (MTN)
  - 01 01 02 03 04 (Moov)
  - 04 01 02 03 04 (Wave)
```

---

## Flux de paiement

### 1. Initiation du paiement

```typescript
// src/services/payments/intouchPaymentService.ts:40
async initiatePayment(data: PaymentRequest): Promise<PaymentResponse>
```

**Paramètres :**

```typescript
interface PaymentRequest {
  amount: number; // Montant en FCFA
  recipient_phone_number: string; // Numéro du destinataire
  partner_transaction_id?: string; // ID transaction unique
  callback_url?: string; // URL de callback webhook
  operator: MobileMoneyOperator; // OM | MTN | MOOV | WAVE
  otp?: string; // OTP (requis pour Orange)
}
```

**Réponse :**

```typescript
interface PaymentResponse {
  success: boolean;
  transaction_id: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  message: string;
  data?: unknown;
}
```

### 2. Validation du numéro de téléphone

```typescript
// src/services/payments/intouchPaymentService.ts:115
validatePhoneNumber(phone: string): {
  valid: boolean;
  formatted: string;
  error?: string;
}
```

**Validations effectuées :**

1. Suppression de tous les caractères non numériques
2. Suppression de l'indicatif pays `225` si présent
3. Vérification de la longueur (exactement 10 chiffres)
4. Validation du préfixe opérateur

### 3. Timeout et gestion d'erreur

```typescript
// Timeout de 30 secondes
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);
```

---

## Paiements récurrents

### Service de paiements récurrents

Le système permet de planifier des paiements automatiques pour les loyers mensuels.

```typescript
// src/services/payments/recurringPaymentService.ts:242
class RecurringPaymentService
```

### Configuration d'un paiement récurrent

```typescript
interface RecurringPaymentConfig {
  leaseId: string;
  amount: number;
  phoneNumber: string;
  operator: MobileMoneyOperator;
  startDate: Date;
  frequency?: 'weekly' | 'biweekly' | 'monthly';
}
```

### Méthodes disponibles

| Méthode                        | Description                         |
| ------------------------------ | ----------------------------------- |
| `scheduleMonthlyPayment()`     | Crée un paiement récurrent          |
| `processDuePayments()`         | Traite les paiements dus (cron job) |
| `suspendRecurringPayment()`    | Suspend un paiement actif           |
| `reactivateRecurringPayment()` | Réactive un paiement suspendu       |
| `cancelRecurringPayment()`     | Annule définitivement un paiement   |
| `getRecurringPayments()`       | Récupère les paiements d'un bail    |

### Gestion des échecs

Le système gère automatiquement les échecs de paiement :

1. Enregistrement dans la table `failed_payments`
2. Suspension automatique après 3 échecs consécutifs
3. Notification du propriétaire/locataire

---

## Types et interfaces

### Types de statut de paiement

```typescript
// src/types/payment.types.ts:27
type PaymentStatus =
  | 'pending' // En attente de confirmation
  | 'initiated' // Paiement initié
  | 'processing' // En cours de traitement
  | 'completed' // Paiement réussi
  | 'failed' // Paiement échoué
  | 'cancelled' // Annulé par l'utilisateur
  | 'expired'; // Délai d'attente dépassé
```

### Mapping des statuts INTOUCH

```typescript
// src/types/payment.types.ts:187
const INTOUCH_STATUS_MAPPING: Record<InTouchStatus, PaymentStatus> = {
  PENDING: 'processing',
  SUCCESS: 'completed',
  FAILED: 'failed',
  PROCESSING: 'processing',
  CANCELLED: 'cancelled',
};
```

### Codes d'erreur

```typescript
// src/types/payment.types.ts:164
enum PaymentErrorCode {
  INVALID_PHONE = 'INVALID_PHONE',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  DUPLICATE_TRANSACTION = 'DUPLICATE_TRANSACTION',
  CANCELLED_BY_USER = 'CANCELLED_BY_USER',
  INVALID_OTP = 'INVALID_OTP',
  TRANSACTION_EXPIRED = 'TRANSACTION_EXPIRED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
```

---

## Gestion des erreurs

### Messages d'erreur courants

| Code                   | Message                      | Action                           |
| ---------------------- | ---------------------------- | -------------------------------- |
| `INVALID_PHONE`        | Numéro de téléphone invalide | Vérifier le format (10 chiffres) |
| `INVALID_OTP`          | OTP invalide pour Orange     | Demander un nouvel OTP           |
| `TIMEOUT`              | Délai d'attente dépassé      | Réessayer plus tard              |
| `INSUFFICIENT_BALANCE` | Solde insuffisant            | Vérifier le solde Mobile Money   |

### Exemple de gestion d'erreur

```typescript
try {
  const result = await intouchService.initiatePayment({
    amount: 50000,
    recipient_phone_number: '0701020304',
    operator: 'OM',
    otp: '123456',
  });
} catch (error) {
  if (error instanceof Error) {
    console.error('Payment failed:', error.message);
    // Afficher un message à l'utilisateur
  }
}
```

---

## Sécurité

### Vérification HMAC

Le système utilise la vérification HMAC pour sécuriser les webhooks :

```typescript
// Headers supportés:
X - Webhook - Signature;
X - InTouch - Signature;
X - Hub - Signature - 256;
X - Signature;
```

### Authentification

- Utilisation de Supabase Auth pour l'authentification utilisateur
- Token Bearer pour les appels API vers l'Edge Function
- Credentials API stockés côté serveur uniquement

### Protection contre les attaques

- Comparaison timing-safe pour les signatures HMAC
- Timeout des requêtes (30 secondes)
- Validation stricte des numéros de téléphone
- Protection contre les transactions en double

---

## Base de données

### Tables utilisées

#### `payments`

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  lease_id UUID REFERENCES leases(id),
  tenant_id UUID REFERENCES profiles(id),
  amount DECIMAL(10,2) NOT NULL,
  status payment_status NOT NULL,
  payment_method TEXT,
  transaction_reference TEXT UNIQUE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `recurring_payments`

```sql
CREATE TABLE recurring_payments (
  id UUID PRIMARY KEY,
  lease_id UUID REFERENCES leases(id),
  tenant_id UUID REFERENCES profiles(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_day INTEGER NOT NULL,
  frequency TEXT NOT NULL,
  provider TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  next_payment_date TIMESTAMPTZ NOT NULL,
  last_payment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `failed_payments`

```sql
CREATE TABLE failed_payments (
  id UUID PRIMARY KEY,
  recurring_payment_id UUID REFERENCES recurring_payments(id),
  error TEXT NOT NULL,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Exemple d'utilisation

### Paiement ponctuel

```typescript
import { intouchService } from '@/services/payments/intouchPaymentService';

// Valider le numéro
const validation = intouchService.validatePhoneNumber('2250701020304');
if (!validation.valid) {
  console.error(validation.error);
  return;
}

// Initier le paiement
const result = await intouchService.initiatePayment({
  amount: 50000,
  recipient_phone_number: validation.formatted,
  operator: 'OM',
  otp: '123456',
  partner_transaction_id: `LEASE-${leaseId}-${Date.now()}`,
});

console.log('Transaction ID:', result.transaction_id);
```

### Paiement récurrent

```typescript
import { RecurringPaymentService } from '@/services/payments/recurringPaymentService';

// Créer un paiement récurrent
await RecurringPaymentService.scheduleMonthlyPayment({
  leaseId: 'uuid-lease',
  amount: 50000,
  phoneNumber: '0701020304',
  operator: 'OM',
  startDate: new Date('2024-01-01'),
  frequency: 'monthly',
});
```

---

## Frais et commissions

### Frais par opérateur

| Opérateur        | Frais de transaction |
| ---------------- | -------------------- |
| Orange Money     | 1.5%                 |
| MTN Mobile Money | 1.5%                 |
| Moov Money       | 1.2%                 |
| Wave             | 1.0%                 |

### Commission plateforme

```typescript
// src/types/payment.types.ts:56
const PLATFORM_FEE_PERCENTAGE = 5; // 5%
```

### Calcul du montant total

```typescript
interface PaymentCalculation {
  baseAmount: number; // Montant du loyer
  providerFee: number; // Frais opérateur
  platformFee: number; // Commission plateforme
  totalAmount: number; // Total à payer
  landlordAmount: number; // Montant reçu par le propriétaire
}
```

---

## Webhooks et callbacks

### Payload du webhook

```typescript
interface WebhookPayload {
  provider: MobileMoneyProvider;
  transactionId: string;
  externalTransactionId: string;
  status: 'success' | 'failed' | 'pending';
  amount: number;
  phoneNumber: string;
  timestamp: string;
  signature: string;
  metadata?: Record<string, unknown>;
}
```

### URL de callback

```typescript
const callbackUrl = `${window.location.origin}/functions/v1/payment-callback`;
```

---

## Ressources

- **Documentation API INTOUCH** : https://apidist.gutouch.net/apidist/sec
- **Edge Function Supabase** : `/functions/v1/payment`
- **Tests unitaires** : `src/test/hmac.test.ts`

---

_Document généré le 30 mars 2026 - MonToit Platform v3.3.1_
