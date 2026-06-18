# SUTA — Assistant IA avec LiteRT

## Architecture

```
Navigateur                          Serveur Next.js                    Serveur LiteRT (Python)
┌──────────────┐   SSE stream       ┌──────────────────────┐          ┌────────────────────┐
│              │  POST /api/suta    │  route.ts            │  OpenAI  │ litert-lm serve    │
│ suta-chatbot │◄──────────────────►│  ├─ handleStreaming──►├─────────►│ port 9379          │
│  (React)     │   ?stream=true     │  ├─ handleNonStreaming│          │ Modèle: suta-gemma3│
│              │                    │  └─ fallback Azure   │          └────────────────────┘
└──────────────┘                    └──────────┬───────────┘
                                               │
                                        ┌──────▼───────┐
                                        │ Azure OpenAI │
                                        │ (cloud)      │
                                        └──────────────┘
```

- **Frontend** : `src/components/suta-chatbot.tsx` — composant React client
- **API** : `src/app/api/suta/route.ts` — route Next.js (GET, POST, DELETE)
- **Client LiteRT** : `src/lib/litert-server.ts` — appel HTTP vers le serveur LiteRT
- **Moteur local** : `litert-lm serve` — processus Python exposant une API OpenAI-compatible
- **Fallback cloud** : Azure OpenAI (déclenché si le serveur LiteRT est indisponible)

## Modèle

- **Modèle** : Gemma 3 1B instruct
- **Format** : LiteRT LM (`.litertlm`)
- **Quantification** : q4 (558 MB)
- **Fichier** : `liteRT/Gemma3-1B-IT_multi-prefill-seq_q4_ekv4096.litertlm` (gitignoré)
- **Backend** : CPU (par défaut), GPU si disponible

## Prérequis

- Python 3.10+ avec `pip`
- Node.js 24+
- Modèle Gemma 3 1B téléchargé dans `liteRT/`

## Installation

### 1. Installer le package Python litert-lm

```bash
pip install litert-lm
```

### 2. Importer le modèle

```bash
npm run litert:import
```

Cette commande importe le modèle depuis `liteRT/` vers `~/.litert-lm/models/suta-gemma3/`.

### 3. Variables d'environnement

Créer `.env.local` (voir `.env.local.example`) :

```env
LITERT_SERVER_URL=http://localhost:9379
LITERT_MODEL=suta-gemma3
```

Pour le fallback Azure OpenAI (optionnel) :

```env
VITE_AZURE_OPENAI_ENDPOINT=https://...
VITE_AZURE_OPENAI_API_KEY=...
VITE_AZURE_OPENAI_DEPLOYMENT_NAME=...
```

## Utilisation

### Démarrer le serveur LiteRT

```bash
npm run litert:serve
```

Le serveur écoute sur `http://localhost:9379` et expose une API compatible OpenAI :
- `GET /v1/models` — lister les modèles
- `POST /v1/chat/completions` — chat completions (streaming et non-streaming)

### Démarrer le serveur Next.js

```bash
# Terminal 2
npm run dev
```

### Ou en un seul terminal

```bash
# Lancer d'abord litert:serve, puis dans un autre terminal npm run dev
npm run dev:full
```

## API

### `GET /api/suta`

Retourne le statut et le mode d'inférence actuel.

```json
{
  "available": true,
  "inference": {
    "mode": "litert",
    "model": "suta-gemma3",
    "backend": "litert"
  },
  "model": {
    "local": "suta-gemma3",
    "cloud": {
      "provider": "Azure OpenAI",
      "configured": true
    }
  }
}
```

### `POST /api/suta`

Envoie un message et reçoit une réponse.

**Corps de la requête :**

```json
{
  "message": "Comment chercher un logement ?",
  "sessionId": "suta-1234567890-abc1234"
}
```

**Réponse (non-streaming) :**

```json
{
  "success": true,
  "response": "Pour chercher un logement sur Mon Toit...",
  "mode": "litert"
}
```

### `POST /api/suta?stream=true`

Même requête mais la réponse est streamée en Server-Sent Events (SSE).

**Format SSE :**

```
data: {"mode":"litert"}

data: {"id":"...","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"Pour"}}]}

data: {"id":"...","choices":[{"index":0,"delta":{"content":" chercher"}}]}

data: [DONE]
```

### `DELETE /api/suta?sessionId=...`

Supprime l'historique de la session.

## Sécurité

- **SUTA est accessible sans authentification** — utilisable par tout visiteur du site
- **Rate limiting** : 20 requêtes par minute par IP (ou par userId si connecté)
- **Le modèle local est privé** — les données ne quittent pas le serveur
- **Azure OpenAI** : les données transitent par le réseau Azure (cloud)

## Gestion des sessions

L'historique des conversations est stocké en mémoire côté serveur (Map). Chaque session est identifiée par un `sessionId` unique généré côté client (`sessionStorage`).

| Propriété | Valeur |
|-----------|--------|
| Stockage | Mémoire (Map) |
| Persistance | Session navigateur |
| Expiration | 30 minutes d'inactivité |
| Max messages | 20 par session |

## Streaming

Le streaming utilise Server-Sent Events (SSE) :

1. Le frontend envoie `POST /api/suta?stream=true`
2. La route Next.js appelle `litert-lm serve /v1/chat/completions` avec `stream: true`
3. Chaque token est forwardé au client via SSE
4. Le frontend met à jour le message assistant token par token
5. Un curseur clignotant (`animate-pulse`) indique que le message est en cours de génération

## Fallback

Si le serveur LiteRT est indisponible, la route API bascule automatiquement sur Azure OpenAI :

1. `checkLiteRTHealth()` teste `GET /v1/models` (timeout 3s)
2. Si KO → Azure OpenAI
3. Si le streaming LiteRT échoue après le premier appel → Azure OpenAI (non-streaming)
4. Le mode est retourné dans la réponse (`mode: "litert"` ou `mode: "cloud"`)

## Scripts npm

| Script | Description |
|--------|-------------|
| `npm run litert:serve` | Démarre le serveur LiteRT |
| `npm run litert:import` | Importe le modèle |
| `npm run dev` | Démarre Next.js |
| `npm run dev:full` | Rappel : lancer d'abord `litert:serve` |

## Tests

```bash
# Vérifier que le serveur Next.js tourne sur :5000
# Vérifier que le serveur LiteRT tourne sur :9379

node scripts/test-suta.mjs
```

Le script teste :
1. GET /api/suta (status + mode)
2. POST /api/suta (message simple)
3. Validation (sessionId vide → 400)
4. Détection du mode d'inférence
5. Streaming SSE (multiples tokens)
6. Message long

## Structure des fichiers

```
src/
├── app/api/suta/route.ts       # API Next.js (GET, POST, DELETE)
├── components/suta-chatbot.tsx  # Composant React du chat
└── lib/litert-server.ts         # Client HTTP vers le serveur LiteRT

scripts/test-suta.mjs            # Script de test
liteRT/                          # Modèle Gemma 3 1B (gitignoré)
docs/suta-litert.md              # Cette documentation
```

## Déploiement

Le modèle est stocké dans `~/.litert-lm/models/suta-gemma3/` sur le serveur.

Le processus `litert-lm serve` doit être managé (systemd, supervisor, PM2, etc.).

La variable `LITERT_SERVER_URL` doit pointer vers le serveur LiteRT en production.

## Problèmes courants

| Problème | Cause | Solution |
|----------|-------|----------|
| `LiteRT non disponible` | Serveur litert-lm pas lancé | `npm run litert:serve` |
| `Azure OpenAI 403` | Pare-feu réseau | Utiliser le mode LiteRT local |
| Réponse en anglais | Modèle non quantifié | Vérifier que le modèle est bien Gemma 3 1B q4 |
| Erreur 500 POST | Modèle non importé | `npm run litert:import` |
