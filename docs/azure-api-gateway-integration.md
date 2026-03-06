# Documentation d'Intégration de l'API Gateway Azure

## Table des matières

1. [Introduction](#introduction)
2. [Prérequis](#prérequis)
3. [Architecture](#architecture)
4. [Configuration Azure](#configuration-azure)
5. [Configuration du Projet](#configuration-du-projet)
6. [Implémentation](#implémentation)
7. [Utilisation](#utilisation)
8. [Monitoring et Logging](#monitoring-et-logging)
9. [Sécurité](#sécurité)
10. [Bonnes Pratiques](#bonnes-pratiques)

---

## Introduction

L'API Gateway Azure (Azure API Management ou Azure Application Gateway) permet de centraliser et sécuriser l'accès aux différents services Azure utilisés dans le projet MonToit, notamment :

- Azure OpenAI (chatbot IA)
- Azure AI Services (vision, analyse)
- Azure Speech Services (STT/TTS)
- Azure Communication Services (SMS)

**Avantages :**
- Un point d'entrée unique pour tous les services Azure
- Gestion centralisée de l'authentification et de l'autorisation
- Rate limiting et throttling
- Monitoring et logging unifiés
- Cache et optimisation des performances

---

## Prérequis

### Compte Azure
- Un compte Azure actif avec un abonnement payant
- Permissions pour créer des ressources (Contributor ou Owner)

### Outils
- Azure CLI (`az`)
- Node.js 18+
- Accès au portail Azure (portal.azure.com)

### Ressources existantes dans MonToit
Les services Azure suivants sont déjà configurés :
- Azure OpenAI
- Azure AI Services
- Azure Speech Services
- Azure Communication Services (SMS)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Application MonToit                          │
│                        (Frontend React + Supabase)                  │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         │ HTTPS
                         │
┌────────────────────────▼────────────────────────────────────────────┐
│                   API Gateway Azure (APIM)                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                        Policy Layer                          │  │
│  │  • Authentification (JWT)                                     │  │
│  │  • Rate Limiting                                              │  │
│  │  • CORS                                                       │  │
│  │  • Validation Request                                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                      Routing Layer                            │  │
│  │  /api/ai/*      → Azure OpenAI                                │  │
│  │  /api/speech/*  → Azure Speech Services                       │  │
│  │  /api/vision/*  → Azure AI Services                           │  │
│  │  /api/sms/*     → Azure Communication Services                │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
┌────────▼──────┐ ┌──────▼────────┐ ┌────▼────────────┐
│ Azure OpenAI  │ │ Azure Speech  │ │ Azure Comm.    │
│               │ │  Services     │ │  Services      │
└───────────────┘ └───────────────┘ └────────────────┘
```

---

## Configuration Azure

### Étape 1 : Créer une instance API Management

```bash
# Connecter à Azure
az login

# Créer un groupe de ressources (optionnel)
az group create --name montoit-rg --location francecentral

# Créer l'instance APIM
az apim create \
  --name montoit-apim \
  --resource-group montoit-rg \
  --location francecentral \
  --publisher-email dev@ansut.ci \
  --publisher-name MonToit \
  --sku-name Consumption \
  --enable-managed-identity
```

**Note :** Le SKU `Consumption` est recommandé pour les tests et le développement. Pour la production, considérez `Developer` ou `Standard` pour des fonctionnalités avancées.

### Étape 2 : Configurer les Backends

#### Backend Azure OpenAI

```bash
# Obtenir les informations Azure OpenAI
AZURE_OPENAI_RESOURCE="montoit-openai"
AZURE_OPENAI_RESOURCE_GROUP="montoit-rg"

# Créer le backend
az apim backend create \
  --service-name montoit-apim \
  --resource-group montoit-rg \
  --backend-id azure-openai \
  --url $(az cognitiveservices account show \
           --name $AZURE_OPENAI_RESOURCE \
           --resource-group $AZURE_OPENAI_RESOURCE_GROUP \
           --query properties.endpoint -o tsv) \
  --resource-id /subscriptions/$(az account show --query id -o tsv)/resourceGroups/$AZURE_OPENAI_RESOURCE_GROUP/providers/Microsoft.CognitiveServices/accounts/$AZURE_OPENAI_RESOURCE \
  --protocol http
```

#### Backend Azure Speech

```bash
AZURE_SPEECH_RESOURCE="montoit-speech"
AZURE_SPEECH_RESOURCE_GROUP="montoit-rg"

az apim backend create \
  --service-name montoit-apim \
  --resource-group montoit-rg \
  --backend-id azure-speech \
  --url https://$(az cognitiveservices account show \
           --name $AZURE_SPEECH_RESOURCE \
           --resource-group $AZURE_SPEECH_RESOURCE_GROUP \
           --query properties.endpoint -o tsv | sed 's|https://||') \
  --resource-id /subscriptions/$(az account show --query id -o tsv)/resourceGroups/$AZURE_SPEECH_RESOURCE_GROUP/providers/Microsoft.CognitiveServices/accounts/$AZURE_SPEECH_RESOURCE \
  --protocol http
```

#### Backend Azure Communication Services

```bash
AZURE_COMM_RESOURCE="montoit-comm"
AZURE_COMM_RESOURCE_GROUP="montoit-rg"

az apim backend create \
  --service-name montoit-apim \
  --resource-group montoit-rg \
  --backend-id azure-communication \
  --url https://$(az communication show \
           --name $AZURE_COMM_RESOURCE \
           --resource-group $AZURE_COMM_RESOURCE_GROUP \
           --query properties.dataLocation -o tsv).communication.azure.com \
  --resource-id /subscriptions/$(az account show --query id -o tsv)/resourceGroups/$AZURE_COMM_RESOURCE_GROUP/providers/Microsoft.Communication/communicationServices/$AZURE_COMM_RESOURCE \
  --protocol https
```

### Étape 3 : Configurer les APIs

#### API OpenAI

```bash
# Importer l'API OpenAI (spécification OpenAPI)
az apim api import \
  --service-name montoit-apim \
  --resource-group montoit-rg \
  --api-id openai \
  --path /api/ai \
  --specification-url https://raw.githubusercontent.com/Azure/azure-rest-api-specs/main/specification/cognitiveservices/data-plane/AzureOpenAI/inference/preview/2024-10-21/inference.json \
  --display-name "Azure OpenAI" \
  --protocols https
```

#### API Speech

```bash
az apim api import \
  --service-name montoit-apim \
  --resource-group montoit-rg \
  --api-id speech \
  --path /api/speech \
  --display-name "Azure Speech Services" \
  --protocols https
```

#### API Communication Services

```bash
az apim api create \
  --service-name montoit-apim \
  --resource-group montoit-rg \
  --api-id communication \
  --path /api/sms \
  --display-name "Azure Communication Services" \
  --protocols https

# Ajouter l'opération d'envoi de SMS
az apim api operation create \
  --service-name montoit-apim \
  --resource-group montoit-rg \
  --api-id communication \
  --url-template /send \
  --method post \
  --display-name "Send SMS" \
  --template-parameters name=phone-number required=true type=string \
                       name=message required=true type=string
```

### Étape 4 : Configurer les Policies

#### Policy de base (au niveau de l'API)

Créer le fichier `api-policy.xml` :

```xml
<policies>
    <inbound>
        <!-- Authentification via API Key -->
        <set-header name="api-key" exists-action="override">
            <value>{{azure-openai-api-key}}</value>
        </set-header>

        <!-- CORS -->
        <cors allow-credentials="true">
            <allowed-origins>
                <origin>https://montoit.ansut.ci</origin>
                <origin>https://app.montoit.ci</origin>
            </allowed-origins>
            <allowed-methods>
                <method>GET</method>
                <method>POST</method>
                <method>PUT</method>
                <method>DELETE</method>
                <method>OPTIONS</method>
            </allowed-methods>
            <allowed-headers>
                <header>*</header>
            </allowed-headers>
            <expose-headers>
                <header>*</header>
            </expose-headers>
            <max-age>86400</max-age>
        </cors>

        <!-- Rate Limiting -->
        <rate-limit-by-key calls="100"
                          renewal-period="60"
                          counter-key="@(context.Request.IpAddress)" />

        <!-- Forward request to backend -->
        <base />
    </inbound>
    <backend>
        <base />
    </backend>
    <outbound>
        <base />
    </outbound>
    <on-error>
        <base />
        <!-- Log errors -->
        <log-to-eventhub logger-id="apim-logger"
                         partition-key="@(context.Request.IpAddress)" />
    </on-error>
</policies>
```

Appliquer la policy :

```bash
az apim api policy create \
  --service-name montoit-apim \
  --resource-group montoit-rg \
  --api-id openai \
  --policy-format xml \
  --value @api-policy.xml
```

### Étape 5 : Configurer les Secrets et Named Values

```bash
# Créer des Named Values pour les secrets
az apim nv create \
  --service-name montoit-apim \
  --resource-group montoit-rg \
  --named-value-id azure-openai-api-key \
  --display-name "Azure OpenAI API Key" \
  --secret true \
  --value YOUR_AZURE_OPENAI_KEY

az apim nv create \
  --service-name montoit-apim \
  --resource-group montoit-rg \
  --named-value-id azure-speech-api-key \
  --display-name "Azure Speech API Key" \
  --secret true \
  --value YOUR_AZURE_SPEECH_KEY

az apim nv create \
  --service-name montoit-apim \
  --resource-group montoit-rg \
  --named-value-id azure-connection-string \
  --display-name "Azure Communication Connection String" \
  --secret true \
  --value "endpoint=https://YOUR_RESOURCE.communication.azure.com/;accesskey=YOUR_KEY"
```

### Étape 6 : Configurer l'Identity (si nécessaire)

```bash
# Activer l'identité gérée
az apim update \
  --service-name montoit-apim \
  --resource-group montoit-rg \
  --enable-managed-identity true

# Obtenir l'identité PRINCIPAL_ID
PRINCIPAL_ID=$(az apim show \
  --name montoit-apim \
  --resource-group montoit-rg \
  --query identity.principalId -o tsv)

# Assigner le rôle Cognitive Services User aux backends
az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role "Cognitive Services User" \
  --scope /subscriptions/$(az account show --query id -o tsv)/resourceGroups/montoit-rg
```

---

## Configuration du Projet

### Variables d'environnement

Ajouter les variables suivantes à votre fichier `.env` :

```env
# =============================================================================
# API GATEWAY AZURE (API Management)
# =============================================================================

# URL de base de l'API Gateway
VITE_AZURE_API_GATEWAY_URL=https://montoit-apim.azure-api.net

# Subscription Key pour l'API Management
VITE_AZURE_API_GATEWAY_SUBSCRIPTION_KEY=

# Policy pour le rate limiting côté client
AZURE_API_GATEWAY_RATE_LIMIT=100
AZURE_API_GATEWAY_RATE_PERIOD=60  # secondes

# Fallback vers les endpoints directs (si gateway indisponible)
VITE_AZURE_USE_GATEWAY=true
```

Mettre à jour le fichier `.env.example` avec ces nouvelles variables.

### Mettre à jour la configuration des API Keys

Modifier `src/shared/config/api-keys.config.ts` :

```typescript
interface AzureApiGatewayConfig extends ApiConfig {
  subscriptionKey: string;
  fallbackUrls: {
    openai: string;
    speech: string;
    aiServices: string;
  };
  useGateway: boolean;
}

class ApiKeysConfig {
  // ... code existant ...

  readonly azure = {
    // ... configuration existante OpenAI, AI Services, Speech ...

    // Nouveau: API Gateway
    gateway: {
      url: import.meta.env['VITE_AZURE_API_GATEWAY_URL'] || '',
      subscriptionKey: import.meta.env['VITE_AZURE_API_GATEWAY_SUBSCRIPTION_KEY'] || '',
      key: import.meta.env['VITE_AZURE_API_GATEWAY_SUBSCRIPTION_KEY'] || '',
      isConfigured: !!(
        import.meta.env['VITE_AZURE_API_GATEWAY_URL'] &&
        import.meta.env['VITE_AZURE_API_GATEWAY_SUBSCRIPTION_KEY']
      ),
      useGateway: import.meta.env['VITE_AZURE_USE_GATEWAY'] !== 'false',
      fallbackUrls: {
        openai: import.meta.env['VITE_AZURE_OPENAI_ENDPOINT'] || '',
        speech: import.meta.env['AZURE_SPEECH_TTS_ENDPOINT'] || '',
        aiServices: import.meta.env['VITE_AZURE_AI_SERVICES_ENDPOINT'] || '',
      },
    } as AzureApiGatewayConfig,
  };
}
```

---

## Implémentation

### 1. Créer le service API Gateway

Créer `src/services/azure/api-gateway.service.ts` :

```typescript
/**
 * Azure API Gateway Service
 * Service centralisé pour communiquer avec les services Azure via APIM
 */

import apiKeysConfig from '@/shared/config/api-keys.config';

interface GatewayRequestOptions {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

interface GatewayResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  statusCode: number;
}

class AzureApiGatewayService {
  private baseUrl: string;
  private subscriptionKey: string;
  private useGateway: boolean;
  private fallbackUrls: Record<string, string>;

  constructor() {
    const gateway = apiKeysConfig.azure.gateway;
    this.baseUrl = gateway.url;
    this.subscriptionKey = gateway.subscriptionKey;
    this.useGateway = gateway.isConfigured && gateway.useGateway;
    this.fallbackUrls = gateway.fallbackUrls;
  }

  /**
   * Effectue une requête via l'API Gateway
   */
  async request<T = any>(options: GatewayRequestOptions): Promise<GatewayResponse<T>> {
    const { endpoint, method = 'POST', headers = {}, body, timeout = 30000 } = options;

    // Headers communs
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    // Ajouter la subscription key si via gateway
    if (this.useGateway && this.subscriptionKey) {
      requestHeaders['Ocp-Apim-Subscription-Key'] = this.subscriptionKey;
    }

    // Construire l'URL
    let url: string;
    if (this.useGateway) {
      url = `${this.baseUrl}${endpoint}`;
    } else {
      // Mode fallback: utiliser les endpoints directs
      url = this.getFallbackUrl(endpoint);
    }

    // Configuration de la requête
    const fetchOptions: RequestInit = {
      method,
      headers: requestHeaders,
      signal: AbortSignal.timeout(timeout),
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, fetchOptions);
      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          data,
          statusCode: response.status,
        };
      }

      // Erreur retournée par l'API
      return {
        success: false,
        error: {
          code: data.error?.code || 'API_ERROR',
          message: data.error?.message || response.statusText,
          details: data.error,
        },
        statusCode: response.status,
      };
    } catch (error) {
      // Tenter le fallback en cas d'erreur de connexion
      if (this.useGateway) {
        console.warn('API Gateway error, attempting fallback...', error);
        return this.requestWithFallback<T>(options, error);
      }

      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error',
        },
        statusCode: 0,
      };
    }
  }

  /**
   * Tentative de fallback vers l'endpoint direct
   */
  private async requestWithFallback<T>(
    originalOptions: GatewayRequestOptions,
    originalError: any
  ): Promise<GatewayResponse<T>> {
    const { endpoint, method = 'POST', headers = {}, body, timeout = 30000 } = originalOptions;

    const fallbackUrl = this.getFallbackUrl(endpoint);

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'api-key': apiKeysConfig.azure.openai.key,
      ...headers,
    };

    try {
      const response = await fetch(fallbackUrl, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeout),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Fallback request successful');
        return {
          success: true,
          data,
          statusCode: response.status,
        };
      }

      return {
        success: false,
        error: {
          code: 'FALLBACK_ERROR',
          message: data.error?.message || response.statusText,
        },
        statusCode: response.status,
      };
    } catch (fallbackError) {
      console.error('Both gateway and fallback failed', { originalError, fallbackError });
      return {
        success: false,
        error: {
          code: 'COMPLETE_FAILURE',
          message: 'Both gateway and direct endpoint failed',
        },
        statusCode: 0,
      };
    }
  }

  /**
   * Obtient l'URL de fallback pour un endpoint donné
   */
  private getFallbackUrl(endpoint: string): string {
    if (endpoint.startsWith('/api/ai')) {
      return this.fallbackUrls.openai || endpoint;
    }
    if (endpoint.startsWith('/api/speech')) {
      return this.fallbackUrls.speech || endpoint;
    }
    if (endpoint.startsWith('/api/vision')) {
      return this.fallbackUrls.aiServices || endpoint;
    }
    return endpoint;
  }

  /**
   * Méthodes spécifiques pour chaque service
   */

  // OpenAI Chat
  async chatCompletion(messages: Array<{ role: string; content: string }>) {
    return this.request({
      endpoint: '/api/ai/deployments/gpt-4o-mini/chat/completions?api-version=2024-10-21',
      method: 'POST',
      body: { messages, max_tokens: 1000 },
    });
  }

  // Speech to Text
  async speechToText(audioBlob: Blob, language = 'fr-FR') {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('language', language);

    return this.request({
      endpoint: '/api/speech/recognition',
      method: 'POST',
      headers: {}, // Content-Type sera défini automatiquement par FormData
      body: formData,
    });
  }

  // Text to Speech
  async textToSpeech(text: string, voice = 'fr-FR-DeniseNeural') {
    return this.request({
      endpoint: '/api/speech/synthesis',
      method: 'POST',
      headers: {
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
      },
      body: `<speak version='1.0' xml:lang='fr-FR'><voice name='${voice}'>${text}</voice></speak>`,
    });
  }

  // Send SMS
  async sendSms(phoneNumber: string, message: string) {
    return this.request({
      endpoint: '/api/sms/send',
      method: 'POST',
      body: {
        from: 'MonToit',
        to: phoneNumber,
        message,
      },
    });
  }

  /**
   * Vérifie l'état de la connexion
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.request({
        endpoint: '/health',
        method: 'GET',
      });
      return response.success;
    } catch {
      return false;
    }
  }

  /**
   * Obtient les statistiques d'utilisation
   */
  async getUsageStats() {
    return this.request({
      endpoint: '/stats',
      method: 'GET',
    });
  }
}

export const azureApiGatewayService = new AzureApiGatewayService();
export default azureApiGatewayService;
```

### 2. Mettre à jour les services existants

#### Mise à jour d'OpenAI Service

Créer `src/services/azure/openai.service.ts` :

```typescript
/**
 * Azure OpenAI Service via API Gateway
 */

import { azureApiGatewayService } from './api-gateway.service';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class AzureOpenAIService {
  private readonly deploymentName = 'gpt-4o-mini';

  /**
   * Complétion de chat
   */
  async chatCompletion(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): Promise<ChatCompletionResponse | null> {
    const {
      maxTokens = 1000,
      temperature = 0.7,
      topP = 1.0,
    } = options;

    const response = await azureApiGatewayService.request({
      endpoint: `/api/ai/deployments/${this.deploymentName}/chat/completions?api-version=2024-10-21`,
      method: 'POST',
      body: {
        messages,
        max_tokens: maxTokens,
        temperature,
        top_p: topP,
      },
    });

    if (response.success && response.data) {
      return response.data;
    }

    console.error('OpenAI chat completion failed:', response.error);
    return null;
  }

  /**
   * Complétion simple (legacy support)
   */
  async complete(prompt: string, options: ChatCompletionOptions = {}): Promise<string | null> {
    const response = await this.chatCompletion(
      [{ role: 'user', content: prompt }],
      options
    );

    return response?.choices[0]?.message.content || null;
  }

  /**
   * Complétion avec streaming (pour le chatbot)
   */
  async *chatCompletionStream(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): AsyncGenerator<string> {
    const {
      maxTokens = 1000,
      temperature = 0.7,
      topP = 1.0,
    } = options;

    // Note: Le streaming nécessite une implémentation avec EventSource
    // Pour simplifier, nous utilisons la méthode non-streaming ici
    const response = await this.chatCompletion(messages, options);

    if (response?.choices[0]?.message.content) {
      yield response.choices[0].message.content;
    }
  }

  /**
   * Complétion de texte (pour la génération de contenu)
   */
  async completeText(prompt: string, options: ChatCompletionOptions = {}): Promise<string | null> {
    return this.complete(prompt, options);
  }

  /**
   * Résumé de texte
   */
  async summarize(text: string, maxLength = 200): Promise<string | null> {
    const response = await this.chatCompletion([
      {
        role: 'system',
        content: 'Tu es un assistant expert en résumé de texte. Résume le texte en français, de manière concise et précise.',
      },
      {
        role: 'user',
        content: `Résume ce texte en environ ${maxLength} caractères maximum:\n\n${text}`,
      },
    ]);

    return response?.choices[0]?.message.content || null;
  }

  /**
   * Analyse de sentiment
   */
  async analyzeSentiment(text: string): Promise<{ sentiment: string; score: number } | null> {
    const response = await this.chatCompletion([
      {
        role: 'system',
        content: 'Analyse le sentiment du texte et réponds uniquement au format JSON: {"sentiment": "positif|neutre|négatif", "score": 0.0-1.0}',
      },
      {
        role: 'user',
        content: text,
      },
    ]);

    try {
      const content = response?.choices[0]?.message.content;
      return content ? JSON.parse(content) : null;
    } catch {
      return null;
    }
  }
}

export const azureOpenAIService = new AzureOpenAIService();
export default azureOpenAIService;
```

### 3. Créer un hook React personnalisé

Créer `src/hooks/useAzureApiGateway.ts` :

```typescript
/**
 * Hook React pour utiliser l'API Gateway Azure
 */

import { useState, useCallback, useEffect } from 'react';
import { azureApiGatewayService, GatewayResponse } from '@/services/azure/api-gateway.service';

interface UseAzureApiGatewayResult<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  execute: () => Promise<void>;
  reset: () => void;
}

export function useAzureApiGateway<T>(
  requestFn: () => Promise<GatewayResponse<T>>,
  autoExecute = false
): UseAzureApiGatewayResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await requestFn();

      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error?.message || 'Request failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [requestFn]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (autoExecute) {
      execute();
    }
  }, [autoExecute, execute]);

  return { data, error, isLoading, execute, reset };
}

// Hooks spécifiques pour chaque service

export function useAzureOpenAIChat() {
  return useAzureApiGateway((messages: Array<{ role: string; content: string }>) =>
    azureApiGatewayService.chatCompletion(messages)
  );
}

export function useAzureSpeechToText() {
  return useAzureApiGateway((audioBlob: Blob) =>
    azureApiGatewayService.speechToText(audioBlob)
  );
}

export function useAzureTextToSpeech() {
  return useAzureApiGateway((text: string, voice?: string) =>
    azureApiGatewayService.textToSpeech(text, voice)
  );
}

export function useAzureSendSms() {
  return useAzureApiGateway((phoneNumber: string, message: string) =>
    azureApiGatewayService.sendSms(phoneNumber, message)
  );
}
```

### 4. Mettre à jour le fichier d'index des services Azure

Mettre à jour `src/services/azure/index.ts` :

```typescript
/**
 * Azure Services Index
 * Export centralisé de tous les services Azure
 */

export { azureApiGatewayService, azureOpenAIService } from './api-gateway.service';
export { default as azureApiGatewayService } from './api-gateway.service';
export { default as azureOpenAIService } from './openai.service';

// Export des hooks
export {
  useAzureApiGateway,
  useAzureOpenAIChat,
  useAzureSpeechToText,
  useAzureTextToSpeech,
  useAzureSendSms,
} from '@/hooks/useAzureApiGateway';
```

---

## Utilisation

### Exemple 1: Utilisation dans un composant React (Chatbot)

```tsx
import { useState } from 'react';
import { azureOpenAIService } from '@/services/azure';

export default function ChatbotComponent() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([
    { role: 'system', content: 'Tu es l\'assistant MonToit.' },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages([...messages, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await azureOpenAIService.chatCompletion([
        ...messages,
        userMessage,
      ]);

      if (response?.choices[0]?.message.content) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: response.choices[0].message.content },
        ]);
      }
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chatbot">
      {/* Messages */}
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Posez votre question..."
          disabled={isLoading}
        />
        <button onClick={handleSend} disabled={isLoading}>
          {isLoading ? '...' : 'Envoyer'}
        </button>
      </div>
    </div>
  );
}
```

### Exemple 2: Utilisation avec le hook personnalisé

```tsx
import { useAzureOpenAIChat } from '@/hooks/useAzureApiGateway';
import { useState } from 'react';

export default function ChatWithHook() {
  const [query, setQuery] = useState('');
  const { data, error, isLoading, execute } = useAzureOpenAIChat();

  const handleSearch = () => {
    if (query.trim()) {
      execute([
        { role: 'system', content: 'Tu es un assistant immobilier.' },
        { role: 'user', content: query },
      ]);
    }
  };

  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Recherchez un bien..."
      />
      <button onClick={handleSearch} disabled={isLoading}>
        Rechercher
      </button>

      {isLoading && <p>Chargement...</p>}

      {error && <p className="error">{error}</p>}

      {data && (
        <div className="result">
          <h3>Réponse:</h3>
          <p>{data.choices[0].message.content}</p>
        </div>
      )}
    </div>
  );
}
```

### Exemple 3: Text-to-Speech

```tsx
import { azureApiGatewayService } from '@/services/azure';
import { useState, useRef } from 'react';

export default function TextToSpeechComponent() {
  const [text, setText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const speak = async () => {
    if (!text.trim()) return;

    setIsSpeaking(true);

    try {
      const response = await azureApiGatewayService.textToSpeech(text, 'fr-FR-DeniseNeural');

      if (response.success && response.data) {
        const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);

        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play();
        }
      }
    } catch (error) {
      console.error('TTS error:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  return (
    <div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Entrez le texte à prononcer..."
      />
      <button onClick={speak} disabled={isSpeaking || !text}>
        {isSpeaking ? 'En cours...' : 'Parler'}
      </button>
      <audio ref={audioRef} onEnded={() => setIsSpeaking(false)} />
    </div>
  );
}
```

### Exemple 4: Envoi de SMS

```tsx
import { azureApiGatewayService } from '@/services/azure';
import { useState } from 'react';

export default function SendSmsComponent() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const sendSms = async () => {
    if (!phoneNumber || !message) return;

    setStatus('sending');

    try {
      const response = await azureApiGatewayService.sendSms(phoneNumber, message);

      if (response.success) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('SMS error:', error);
      setStatus('error');
    }
  };

  return (
    <div>
      <input
        type="tel"
        value={phoneNumber}
        onChange={e => setPhoneNumber(e.target.value)}
        placeholder="+225 01 02 03 04 05"
      />
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Votre message..."
        maxLength={160}
      />
      <button onClick={sendSms} disabled={status === 'sending'}>
        Envoyer SMS
      </button>

      {status === 'success' && <p className="success">SMS envoyé avec succès!</p>}
      {status === 'error' && <p className="error">Erreur lors de l'envoi du SMS</p>}
    </div>
  );
}
```

---

## Monitoring et Logging

### Configuration de l'Application Insights

```bash
# Créer une ressource Application Insights
az monitor app-insights component create \
  --app montoit-insights \
  --location francecentral \
  --resource-group montoit-rg \
  --application-type web

# Obtenir la clé d'instrumentation
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app montoit-insights \
  --resource-group montoit-rg \
  --query instrumentationKey -o tsv)

# Configurer APIM pour envoyer les logs à Application Insights
az apim logger create \
  --service-name montoit-apim \
  --resource-group montoit-rg \
  --logger-id appinsights \
  --logger-type applicationInsights \
  --description "Application Insights Logger" \
  --credentials resourceId=/subscriptions/$(az account show --query id -o tsv)/resourceGroups/montoit-rg/providers/microsoft.insights/components/montoit-insights instrumentationKey=$INSTRUMENTATION_KEY
```

### Dashboard de monitoring

Créer un script pour récupérer les métriques :

```typescript
// src/services/azure/api-gateway-monitoring.service.ts

interface GatewayMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  rateLimitHits: number;
  errorsByType: Record<string, number>;
  endpointUsage: Record<string, number>;
}

class ApiGatewayMonitoringService {
  /**
   * Récupère les métriques depuis Application Insights
   */
  async getMetrics(period = '1h'): Promise<GatewayMetrics> {
    // Appel à l'API Application Insights
    const query = `
      requests
      | where timestamp > ago(${period})
      | summarize
          Total = count(),
          Successful = count(success == true),
          Failed = count(success == false),
          AvgDuration = avg(duration),
          RateLimitHits = count(customDimensions.has('rateLimit'))
      `;
    // Implementation...
    return {} as GatewayMetrics;
  }

  /**
   * Récupère les logs d'erreurs récents
   */
  async getRecentErrors(limit = 50) {
    const query = `
      requests
      | where success == false
      | where timestamp > ago(1d)
      | order by timestamp desc
      | take ${limit}
    `;
    // Implementation...
  }
}

export const apiGatewayMonitoringService = new ApiGatewayMonitoringService();
```

---

## Sécurité

### 1. Rotation des clés API

Les clés API doivent être rotées régulièrement. Voici un script :

```bash
#!/bin/bash
# rotate-api-keys.sh

# Rotation de la clé OpenAI
NEW_OPENAI_KEY=$(az cognitiveservices account keys list \
  --name montoit-openai \
  --resource-group montoit-rg \
  --query key1 -o tsv)

az apim nv create \
  --service-name montoit-apim \
  --resource-group montoit-rg \
  --named-value-id azure-openai-api-key \
  --display-name "Azure OpenAI API Key" \
  --secret true \
  --value $NEW_OPENAI_KEY

echo "API keys rotated successfully"
```

### 2. Validation des requests

Les policies APIM incluent déjà une validation basique. Pour une validation plus avancée :

```xml
<validate-jwt header-name="Authorization" failed-validation-httpcode="401">
  <openid-config url="https://montoit.supabase.co/auth/v1/.well-known/jwks.json" />
  <required-claims>
    <claim name="aud" match="any">
      <value>montoit-api</value>
    </claim>
  </required-claims>
</validate-jwt>
```

### 3. Rate limiting par utilisateur

```xml
<rate-limit-by-key calls="100"
                  renewal-period="60"
                  counter-key="@(context.Request.Headers.GetValueOrDefault("Authorization","").AsJwt()?.Subject ?? context.Request.IpAddress)" />
```

---

## Bonnes Pratiques

### 1. Gestion des erreurs

Toujours inclure une logique de fallback :

```typescript
const response = await azureApiGatewayService.chatCompletion(messages);

if (!response.success) {
  if (response.error?.code === 'RATE_LIMIT_EXCEEDED') {
    // Attendre et réessayer
    await new Promise(resolve => setTimeout(resolve, 1000));
    return await azureApiGatewayService.chatCompletion(messages);
  }

  // Afficher un message utilisateur-friendly
  showToast('Service temporairement indisponible');
}
```

### 2. Cache des réponses

Pour les requêtes idempotentes, utilisez le cache côté client :

```typescript
const cache = new Map();

async function getCachedChatCompletion(messages: string[]) {
  const cacheKey = JSON.stringify(messages);

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const response = await azureOpenAIService.chatCompletion(messages);
  cache.set(cacheKey, response);
  return response;
}
```

### 3. Retry avec backoff exponentiel

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
```

### 4. Limitation de la taille des requests

Les policies APIM limitent déjà la taille des requests, mais côté client :

```typescript
const MAX_REQUEST_SIZE = 1024 * 1024; // 1MB

async function validateRequestSize(data: any) {
  const size = JSON.stringify(data).length;

  if (size > MAX_REQUEST_SIZE) {
    throw new Error(`Request too large: ${size} bytes (max ${MAX_REQUEST_SIZE})`);
  }
}
```

---

## Conclusion

L'intégration de l'API Gateway Azure dans le projet MonToit permet :

- **Centralisation** : Un point d'entrée unique pour tous les services Azure
- **Sécurité** : Authentification centralisée et rate limiting
- **Observabilité** : Monitoring unifié via Application Insights
- **Résilience** : Fallback automatique vers les endpoints directs
- **Maintenance** : Gestion simplifiée des clés et configurations

Pour plus d'informations, consultez la documentation officielle Azure API Management :
https://learn.microsoft.com/en-us/azure/api-management/
