// Enhanced hooks with pagination and error handling
export { useConversationsV2 as useConversations } from './useConversationsV2';
export { useMessagesV2 as useMessages } from './useMessagesV2';

// Legacy hooks (deprecated - use V2 instead)
export { useConversations as useConversationsLegacy } from './useConversations';
export { useMessages as useMessagesLegacy } from './useMessages';

// Other hooks
export { useNotificationSound } from './useNotificationSound';
export { useUnreadCount } from './useUnreadCount';
