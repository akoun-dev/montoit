# Audit du Système de Messagerie - MonToit

**Date:** 2026-02-04
**Acteurs concernés:** Locataire, Propriétaire, Agence
**Statut:** 🔴 Audit Complet

---

## 📊 Résumé Exécutif

Le système de messagerie de MonToit possède une **base solide** avec des fonctionnalités temps réel et une bonne sécurité. Cependant, il manque **plusieurs hooks critiques**, des **fonctionnalités UX essentielles**, et présente des **problèmes d'intégration de routes** entre les différents acteurs.

### Score de Maturité

| Catégorie | Score | Détails |
|-----------|-------|---------|
| Base de données | 🟢 85% | Schéma complet et bien structuré |
| Services API | 🟡 70% | Présents mais hooks manquants |
| Interface UI | 🟡 65% | Composants existants mais UX incomplète |
| Temps réel | 🟢 80% | Subscriptions fonctionnelles |
| Sécurité | 🟢 85% | Permissions et validations |
| Mobile | 🔴 40% | Peu de fonctionnalités mobiles |
| **Global** | **🟡 68%** | **Fondation solide, améliorations nécessaires** |

---

## 📁 Structure Actuelle

### Base de Données

#### Table `conversations`
```typescript
{
  id: string
  participant1_id: string
  participant2_id: string
  property_id: string | null
  last_message_at: string | null
  last_message_id: string | null
  unread_count_participant1: number
  unread_count_participant2: number
  is_archived_by_participant1: boolean
  is_archived_by_participant2: boolean
  created_at: string
  updated_at: string
}
```

#### Table `messages`
```typescript
{
  id: string
  conversation_id: string
  sender_id: string
  receiver_id: string
  content: string | null
  attachments: string[] | null
  attachment_metadata: Json | null
  is_read: boolean
  read_at: string | null
  is_deleted: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}
```

### Fichiers Existant

```
src/
├── features/messaging/
│   ├── components/
│   │   ├── AttachmentPreview.tsx
│   │   ├── ConversationList.tsx
│   │   ├── EmptyConversation.tsx
│   │   ├── ImageLightbox.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── MessageInput.tsx
│   │   ├── MessageThread.tsx
│   │   └── SoundToggle.tsx
│   └── pages/
│       └── MessagesPage.tsx
├── services/messaging/
│   ├── messaging.api.ts
│   └── messaging.service.ts
└── pages/messaging/
    └── MessagesPage.tsx
```

---

## ❌ Éléments Manquants Critiques

### 1. Hooks Non Implémentés

| Hook | Description | Impact |
|------|-------------|--------|
| `useConversations.ts` | Gestion des conversations | 🔴 CRITIQUE - Référencé mais inexistant |
| `useMessages.ts` | Gestion des messages | 🔴 CRITIQUE - Référencé mais inexistant |

**Action requise:** Implémenter ces hooks pour le fonctionnement de base.

### 2. Fonctionnalités Core Manquantes

| Fonctionnalité | Priorité | Description |
|----------------|----------|-------------|
| Pagination des messages | 🔴 HAUTE | Charge tous les messages - problèmes de performance |
| Indicateur "en train d'écrire" | 🟡 MOYENNE | Pas de feedback en temps réel |
| Édition de messages | 🟡 MOYENNE | Impossible de modifier après envoi |
| Recherche de messages | 🟡 MOYENNE | Pas de recherche dans l'historique |
| État de chargement | 🔴 HAUTE | Pas de feedback pendant l'envoi |
| Gestion d'erreurs | 🔴 HAUTE | Pas de retry pour envois échoués |
| Confirmation suppression | 🟡 MOYENNE | Suppression sans confirmation |
| Raccourcis clavier | 🟢 BASSE | Pas de Entrée pour envoyer |
| Bouton scroll bas | 🟡 MOYENNE | Sur longues conversations |
| Timestamps étendus | 🟡 MOYENNE | Seulement HH:mm affiché |

### 3. Intégration Routes Problématique

**Problème identifié:** Les routes de messagerie sont définies dans `tenantRoutes.tsx` mais l'accès pour les propriétaires et agences n'est pas garanti.

```typescript
// src/app/routes/tenantRoutes.tsx:181-191
{
  path: 'messages',
  element: (
    <ProtectedRoute allowedRoles={[...TENANT_ROLES, ...OWNER_ROLES, ...AGENCY_ROLES]}>
      <TenantSidebarLayout />
    </ProtectedRoute>
  ),
  children: [
    { index: true, element: <MessagesPage /> },
  ],
},
```

**Problème:** Utilise `TenantSidebarLayout` pour tous les acteurs - layout incohérent.

---

## 🐛 Bugs et Problèmes Identifiés

### 1. Incohérence de Données

```typescript
// Service utilise parfois attachment_url, parfois attachments
messages.attachment_url  // ❌ N'existe pas dans le schéma
messages.attachments     // ✅ Correct (string[])
```

### 2. Contextes d'Auth Multiples

```typescript
// Différents imports dans différents fichiers
import { useAuth } from '@/app/providers/AuthProvider'
import { useAuth } from '@/contexts/AuthContext'  // ❓ Potentiellement obsolète
```

### 3. Routes Dupliquées

La route `/messages` existe dans plusieurs configurations:
- `/locataire/messages` - TenantSidebarLayout
- `/proprietaire/messages` - MessagesPage direct
- `/agences/messages` - MessagesPage direct

### 4. Subscriptions Nettoyage

```typescript
// Pas de cleanup des anciennes subscriptions
// Risque de memory leaks
```

### 5. État Lecture Non Atomique

```typescript
// Mise à jour du statut lu pas atomique
// Risque de race conditions
```

---

## 📱 Spécifique par Acteur

### Locataire (Tenant)

| Fonctionnalité | Statut | Notes |
|----------------|--------|-------|
| Messagerie propriétaire | ✅ | Fonctionnel |
| Messagerie agence | ✅ | Fonctionnel |
| Messagerie autres locataires | ❌ | Non disponible |
| Intégration demandes maintenance | ❌ | Manquante |
| Notifications push | ⚠️ | Partiel |
| Mode hors-ligne | ❌ | Non implémenté |

### Propriétaire (Owner)

| Fonctionnalité | Statut | Notes |
|----------------|--------|-------|
| Messagerie locataire | ✅ | Fonctionnel |
| Messagerie agence | ✅ | Fonctionnel |
| Notifications renouvellement bail | ❌ | Non automatisé |
| Gestion tâches immobilières | ❌ | Non intégré |
| Mode multi-biens | ⚠️ | Contexte non clair |

### Agence (Agency)

| Fonctionnalité | Statut | Notes |
|----------------|--------|-------|
| Messagerie propriétaires | ✅ | Fonctionnel |
| Messagerie locataires | ✅ | Fonctionnel |
| Messagerie équipe | ❌ | Non disponible |
| Intégration workflow attributions | ❌ | Manquant |
| Messagerie collaborative | ❌ | Non disponible |

---

## 🎯 Recommandations

### Priorité 🔴 CRITIQUE

1. **Implémenter les hooks manquants**
   ```typescript
   // src/hooks/useConversations.ts
   export function useConversations() {
     // Gestion des conversations avec TanStack Query
   }

   // src/hooks/useMessages.ts
   export function useMessages(conversationId: string) {
     // Gestion des messages avec pagination
   }
   ```

2. **Corriger l'intégration des routes**
   - Créer des layouts spécifiques par acteur
   - Unifier la gestion de la messagerie
   - Assurer l'accès pour tous les rôles

3. **Ajouter la pagination des messages**
   ```typescript
   .range(0, 50)  // Premier chargement
   .range(from, to + 50)  // Charger plus
   ```

4. **Gestion d'erreurs robuste**
   ```typescript
   const { mutate: sendMessage, isError, error } = useMutation({
     retry: 3,
     onError: (error) => {
       toast.error('Échec de l\'envoi')
     }
   })
   ```

### Priorité 🟡 MOYENNE

5. **Indicateur de typing**
   - Channel Supabase: `typing:{conversationId}`
   - Affichage "X est en train d'écrire..."

6. **Édition de messages**
   - Fenêtre de 5 minutes après envoi
   - Historique des modifications

7. **Recherche dans les messages**
   - Indexation du contenu
   - Filtres par date/expéditeur

8. **États de chargement**
   - Skeleton pendant envoi
   - Animation de delivery

### Priorité 🟢 BASSE

9. **Réactions aux messages**
   - Emoji reactions (👍, ❤️, etc.)

10. **Raccourcis clavier**
    - Entrée: envoyer
    - Shift+Entrée: nouvelle ligne
    - Échap: annuler

11. **Mode sombre**
    - Thème cohérent avec l'app

12. **Thèmes de conversation**
    - Couleurs personnalisables

---

## 📊 Métriques de Succès

### Objectifs Courts Terme (1-2 semaines)

- [ ] Implémenter `useConversations` et `useMessages`
- [ ] Corriger les routes pour tous les acteurs
- [ ] Ajouter la pagination
- [ ] Gestion d'erreurs avec retry
- [ ] États de chargement

### Objectifs Moyen Terme (1-2 mois)

- [ ] Indicateur de typing
- [ ] Édition de messages
- [ ] Recherche de messages
- [ ] Support hors-ligne
- [ ] Mode équipe pour agences

### Objectifs Long Terme (3-6 mois)

- [ ] Messages vocaux
- [ ] Appels vidéo/audio
- [ ] Groupes de discussion
- [ ] Intégration IA (réponses automatiques)
- [ ] Analyse de sentiment

---

## 🔍 Tests à Implémenter

```typescript
// tests/messaging/messaging.test.ts
describe('Messaging System', () => {
  test('envoie un message avec succès')
  test('marque un message comme lu')
  test('gère les erreurs d\'envoi')
  test('pagine les messages correctement')
  test('affiche l\'indicateur de typing')
  test('met à jour les conversations en temps réel')
  test('bloque un utilisateur')
  test('signale un message inapproprié')
})
```

---

## 📝 Notes Techniques

### Subscriptions Supabase

```typescript
// Pattern recommandé
const channel = supabase
  .channel(`conversation:${conversationId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`
  }, (payload) => {
    // Handle new message
  })
  .subscribe()

// Cleanup important
return () => {
  supabase.removeChannel(channel)
}
```

### RLS Policies

```sql
-- Vérifier que les policies existent
CREATE POLICY "Users can see their conversations"
  ON conversations FOR SELECT
  USING (
    participant1_id = auth.uid() OR
    participant2_id = auth.uid()
  );

CREATE POLICY "Users can insert messages in their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT id FROM conversations
      WHERE participant1_id = auth.uid() OR
            participant2_id = auth.uid()
    )
  );
```

---

## 📅 Date de Prochaine Révision

**Recommandé:** 2026-03-04 (1 mois)

---

**Rédigé par:** Claude Code
**Version:** 1.0
