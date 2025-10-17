import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { DynamicBreadcrumb } from '@/components/navigation/DynamicBreadcrumb';
import MessageTemplates from '@/components/messaging/MessageTemplates';
import AttachmentUpload from '@/components/messaging/AttachmentUpload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MessageCircle, Paperclip, Download, FileText, Image as ImageIcon, File } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/services/logger';
import { sanitizeMessage, sanitizeText } from '@/lib/sanitize';
import type { Message as MessageType } from '@/types';
import { Badge } from '@/components/ui/badge';

interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface MessageDisplay {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  attachments?: Attachment[];
}

interface Conversation {
  id: string;
  user_id: string;
  user_name: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  conversation_type: 'prospect' | 'applicant' | 'tenant' | 'landlord_support';
}

interface UserProfile {
  id: string;
  full_name: string;
}

const Messages = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const recipientId = searchParams.get('recipient');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(recipientId);
  const [messages, setMessages] = useState<MessageDisplay[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadingCompleted = useRef(false);

  // Stop loading if user is not connected
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchConversations();
      
      // Safety timeout: 10 seconds max
      const timeoutId = setTimeout(() => {
        if (!loadingCompleted.current) {
          setLoading(false);
          toast({
            title: 'Chargement lent',
            description: 'Le chargement prend plus de temps que prévu. Vérifiez votre connexion.',
            variant: 'destructive'
          });
        }
      }, 10000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
      markAsRead(selectedConversation);
    }
  }, [selectedConversation]);

  // Auto-create conversation if recipientId is provided
  useEffect(() => {
    if (user && recipientId && !loading) {
      const existingConv = conversations.find(c => c.id === recipientId);
      
      if (!existingConv && !profiles[recipientId]) {
        const fetchRecipientProfile = async () => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('id', recipientId)
            .maybeSingle();
          
          if (profile) {
            setConversations(prev => [{
              id: profile.id,
              user_id: profile.id,
              user_name: profile.full_name || 'Utilisateur',
              last_message: '',
              last_message_time: new Date().toISOString(),
              unread_count: 0,
              conversation_type: 'prospect' as const
            }, ...prev]);
            
            setProfiles(prev => ({
              ...prev,
              [profile.id]: profile
            }));
          }
        };
        
        fetchRecipientProfile();
      }
    }
  }, [recipientId, user, conversations, loading, profiles]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const newMessage = payload.new as MessageType;
          
          // Update conversations list
          fetchConversations();
          
          // If message is from selected conversation, refresh messages
          if (newMessage.sender_id === selectedConversation) {
            fetchMessages(selectedConversation);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${user.id}`,
        },
        (payload) => {
          const newMessage = payload.new as MessageType;
          
          // Update conversations list
          fetchConversations();
          
          // If message is to selected conversation, refresh messages
          if (newMessage.receiver_id === selectedConversation) {
            fetchMessages(selectedConversation);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedConversation]);

  const fetchConversations = async () => {
    if (!user) {
      setLoading(false); // Important
      return;
    }

    try {
      // Fetch all messages where user is sender or receiver
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by conversation partner
      const conversationMap = new Map<string, Conversation>();
      const userIds = new Set<string>();

      messagesData?.forEach(msg => {
        const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        userIds.add(partnerId);

        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, {
            id: partnerId,
            user_id: partnerId,
            user_name: '',
            last_message: msg.content,
            last_message_time: msg.created_at,
            unread_count: msg.receiver_id === user.id && !msg.is_read ? 1 : 0,
            conversation_type: (msg.conversation_type as 'prospect' | 'applicant' | 'tenant' | 'landlord_support') || 'prospect'
          });
        } else {
          const conv = conversationMap.get(partnerId)!;
          if (msg.receiver_id === user.id && !msg.is_read) {
            conv.unread_count++;
          }
        }
      });

      // Fetch user profiles
      if (userIds.size > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', Array.from(userIds));

        const profileMap: Record<string, UserProfile> = {};
        profilesData?.forEach(profile => {
          profileMap[profile.id] = profile;
        });
        setProfiles(profileMap);

        // Update conversation names
        conversationMap.forEach((conv, key) => {
          conv.user_name = profileMap[key]?.full_name || 'Utilisateur inconnu';
        });
      }

      // Determine conversation type for each conversation using RPC
      for (const [partnerId, conv] of conversationMap) {
        const { data: convType } = await supabase.rpc('get_conversation_type', {
          p_sender_id: user.id,
          p_receiver_id: partnerId,
          p_property_id: null
        });
        
        if (convType) {
          conv.conversation_type = convType as 'prospect' | 'applicant' | 'tenant' | 'landlord_support';
        }
      }

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      logger.error('Failed to fetch conversations', { error, userId: user?.id });
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les conversations. Réessayez.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      loadingCompleted.current = true;
    }
  };

  const fetchMessages = async (partnerId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Parse attachments from JSON to proper type
      const parsedMessages: MessageDisplay[] = (data || []).map(msg => {
        let parsedAttachments: Attachment[] = [];
        
        if (msg.attachments) {
          try {
            if (typeof msg.attachments === 'string') {
              parsedAttachments = JSON.parse(msg.attachments);
            } else if (Array.isArray(msg.attachments)) {
              parsedAttachments = msg.attachments as unknown as Attachment[];
            }
          } catch (e) {
            logger.error('Failed to parse message attachments', { error: e, messageId: msg.id });
          }
        }
        
        return {
          id: msg.id,
          sender_id: msg.sender_id,
          receiver_id: msg.receiver_id,
          content: msg.content,
          is_read: msg.is_read,
          created_at: msg.created_at,
          attachments: parsedAttachments
        };
      });
      
      setMessages(parsedMessages);
    } catch (error) {
      logger.error('Failed to fetch messages', { error, partnerId });
    }
  };

  const markAsRead = async (partnerId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', partnerId)
        .eq('receiver_id', user.id)
        .eq('is_read', false);
    } catch (error) {
      logger.error('Failed to mark messages as read', { error, partnerId });
    }
  };

  const sendMessage = async () => {
    if (!user || !selectedConversation || (!newMessage.trim() && attachments.length === 0)) return;

    try {
      const messageData: {
        sender_id: string;
        receiver_id: string;
        content: string;
        attachments?: string;
      } = {
        sender_id: user.id,
        receiver_id: selectedConversation,
        content: newMessage.trim() || '(Pièce(s) jointe(s))'
      };
      
      if (attachments.length > 0) {
        messageData.attachments = JSON.stringify(attachments);
      }

      const { error } = await supabase
        .from('messages')
        .insert([messageData]);

      if (error) throw error;

      setNewMessage('');
      setAttachments([]);

      toast({
        title: "Message envoyé",
        description: "Votre message a été envoyé avec succès"
      });
    } catch (error) {
      logger.error('Failed to send message', { error, receiverId: selectedConversation });
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive"
      });
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    if (type.includes('pdf')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getConversationBadge = (type: 'prospect' | 'applicant' | 'tenant' | 'landlord_support') => {
    const configs = {
      prospect: { emoji: '🟡', label: 'Prospect', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' },
      applicant: { emoji: '🟠', label: 'Candidat', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' },
      tenant: { emoji: '🟢', label: 'Locataire', className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
      landlord_support: { emoji: '🔵', label: 'Support', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' }
    };
    
    const config = configs[type];
    return (
      <Badge className={`${config.className} text-xs`}>
        <span className="mr-1">{config.emoji}</span>
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        <div className="max-w-7xl mx-auto">
          <DynamicBreadcrumb />
          <h1 className="text-3xl font-bold mb-6">Messages</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
            {/* Conversations list */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Conversations</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  {loading ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p>Chargement des conversations...</p>
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Aucune conversation</p>
                      <p className="text-xs mt-2">Commencez à discuter avec un propriétaire</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {conversations.map(conv => (
                        <button
                          key={conv.id}
                          onClick={() => setSelectedConversation(conv.id)}
                          className={`w-full p-4 text-left hover:bg-muted/50 transition-colors border-l-4 ${
                            selectedConversation === conv.id
                              ? 'border-primary bg-muted/50'
                              : 'border-transparent'
                          }`}
                        >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {conv.user_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <p className="font-medium truncate">{sanitizeText(conv.user_name)}</p>
                          {getConversationBadge(conv.conversation_type)}
                        </div>
                        {conv.unread_count > 0 && (
                          <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full flex-shrink-0">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {sanitizeText(conv.last_message)}
                      </p>
                    </div>
                  </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Messages */}
            <Card className="md:col-span-2">
              {selectedConversation && profiles[selectedConversation] ? (
                <>
                  <CardHeader>
                    <CardTitle>
                      {sanitizeText(profiles[selectedConversation].full_name)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ScrollArea className="h-[320px] pr-4">
                      <div className="space-y-4">
                        {messages.map(msg => (
                          <div
                            key={msg.id}
                            className={`flex ${
                              msg.sender_id === user?.id ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                msg.sender_id === user?.id
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <div
                                className="text-sm"
                                dangerouslySetInnerHTML={{
                                  __html: sanitizeMessage(msg.content)
                                }}
                              />
                              
                              {msg.attachments && msg.attachments.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {msg.attachments.map((file, idx) => (
                                    <a
                                      key={idx}
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-xs hover:underline p-2 rounded bg-background/10"
                                    >
                                      {getFileIcon(file.type)}
                                      <span className="truncate">{file.name}</span>
                                      <Download className="h-3 w-3 ml-auto flex-shrink-0" />
                                    </a>
                                  ))}
                                </div>
                              )}

                              <p className="text-xs opacity-70 mt-1">
                                {new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        ))}
                        <div ref={scrollRef} />
                      </div>
                    </ScrollArea>

                    <div className="space-y-3 border-t pt-3">
                      <MessageTemplates onUseTemplate={(content) => setNewMessage(content)} />
                      
                      <AttachmentUpload 
                        attachments={attachments}
                        onAttachmentsChange={setAttachments}
                      />

                      <div className="flex gap-2">
                        <Input
                          placeholder="Écrivez votre message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                        />
                        <Button onClick={sendMessage} size="icon">
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>Sélectionnez une conversation</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Messages;
