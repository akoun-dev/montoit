# Task 1 — Messages Agent

## Task: Create messages API + fix both message components

## Work Done

### API Routes Created

1. **`/api/messages/route.ts`** — GET + POST
   - GET: Lists conversations for current user with participant info, property info, last message, unread count
   - GET with `?conversationId=xxx`: Returns full conversation with all messages, marks messages as read
   - POST: Send message to existing or new conversation, creates conversation if needed

2. **`/api/messages/[id]/route.ts`** — PATCH
   - Mark single message as read
   - Mark all messages in a conversation as read via body params

3. **`/api/users/search/route.ts`** — GET
   - Search users by name/email for new conversations

### Frontend Components Updated

1. **`src/components/dashboard/locataire/messages.tsx`** — Complete rewrite
   - Uses `/api/messages` API
   - Working send, new conversation dialog, unread badges, mark-as-read
   - Responsive layout, Framer Motion animations, French text

2. **`src/components/dashboard/proprietaire/messages.tsx`** — Complete rewrite
   - Same features as locataire
   - Uses `/api/users/search` for finding users

## Key Technical Decisions
- Used `/api/messages` as dedicated messaging API (not dashboard API)
- Created `/api/users/search` for cross-role user discovery (both locataire and proprietaire can use it)
- Messages are marked as read when opening a conversation (both via GET with conversationId and via PATCH)
- Unread count badges use orange (brand-500) to match platform theme
- User search is debounced (300ms) to reduce API calls
