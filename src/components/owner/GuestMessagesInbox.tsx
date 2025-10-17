import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Mail, MailOpen, AlertTriangle, Ban, ExternalLink, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logger } from '@/services/logger';

interface GuestMessage {
  id: string;
  property_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  message_content: string;
  status: 'pending' | 'replied' | 'spam' | 'blocked';
  created_at: string;
  properties?: {
    title: string;
  };
}

export const GuestMessagesInbox = () => {
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchGuestMessages();
    }
  }, [user]);

  const fetchGuestMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('guest_messages')
        .select(`
          *,
          properties (
            title
          )
        `)
        .eq('owner_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMessages((data || []) as GuestMessage[]);
    } catch (error: any) {
      logger.logError(error, { context: 'GuestMessagesInbox', action: 'fetch' });
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les messages',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateMessageStatus = async (messageId: string, newStatus: GuestMessage['status']) => {
    try {
      const { error } = await supabase
        .from('guest_messages')
        .update({ status: newStatus })
        .eq('id', messageId);

      if (error) throw error;

      // Mettre à jour l'état local
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, status: newStatus } : msg
        )
      );

      toast({
        title: 'Statut mis à jour',
        description: `Message marqué comme "${getStatusLabel(newStatus)}"`,
      });
    } catch (error: any) {
      logger.logError(error, { context: 'GuestMessagesInbox', action: 'updateStatus' });
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le statut',
        variant: 'destructive',
      });
    }
  };

  const getStatusLabel = (status: GuestMessage['status']) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'replied': return 'Répondu';
      case 'spam': return 'Spam';
      case 'blocked': return 'Bloqué';
      default: return status;
    }
  };

  const getStatusBadgeVariant = (status: GuestMessage['status']) => {
    switch (status) {
      case 'pending': return 'default';
      case 'replied': return 'secondary';
      case 'spam': return 'destructive';
      case 'blocked': return 'destructive';
      default: return 'default';
    }
  };

  const filteredMessages = messages.filter(msg => {
    if (activeTab === 'all') return true;
    return msg.status === activeTab;
  });

  const getTabCount = (status: string) => {
    if (status === 'all') return messages.length;
    return messages.filter(msg => msg.status === status).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Messages des visiteurs</h2>
        <p className="text-muted-foreground">
          Gérez les messages reçus des visiteurs non inscrits
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">
            En attente ({getTabCount('pending')})
          </TabsTrigger>
          <TabsTrigger value="replied">
            Répondus ({getTabCount('replied')})
          </TabsTrigger>
          <TabsTrigger value="spam">
            Spam ({getTabCount('spam')})
          </TabsTrigger>
          <TabsTrigger value="all">
            Tous ({getTabCount('all')})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {filteredMessages.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Aucun message {activeTab !== 'all' && getStatusLabel(activeTab as GuestMessage['status']).toLowerCase()}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredMessages.map((message) => (
              <Card key={message.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {message.status === 'pending' ? (
                          <Mail className="h-4 w-4 text-primary" />
                        ) : (
                          <MailOpen className="h-4 w-4 text-muted-foreground" />
                        )}
                        {message.guest_name}
                      </CardTitle>
                      <CardDescription>
                        Concernant : {message.properties?.title || 'Propriété supprimée'}
                      </CardDescription>
                    </div>
                    <Badge variant={getStatusBadgeVariant(message.status)}>
                      {getStatusLabel(message.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm whitespace-pre-wrap">{message.message_content}</p>
                  </div>

                  <div className="flex flex-col gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Email :</span>
                      <a
                        href={`mailto:${message.guest_email}`}
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        {message.guest_email}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    {message.guest_phone && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Téléphone :</span>
                        <a
                          href={`tel:${message.guest_phone}`}
                          className="text-primary hover:underline"
                        >
                          {message.guest_phone}
                        </a>
                      </div>
                    )}
                    <div className="text-muted-foreground">
                      Reçu {formatDistanceToNow(new Date(message.created_at), { 
                        addSuffix: true,
                        locale: fr 
                      })}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {message.status === 'pending' && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => updateMessageStatus(message.id, 'replied')}
                        >
                          <MailOpen className="h-4 w-4 mr-2" />
                          Marquer comme répondu
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateMessageStatus(message.id, 'spam')}
                        >
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Spam
                        </Button>
                      </>
                    )}
                    {message.status === 'spam' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => updateMessageStatus(message.id, 'blocked')}
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        Bloquer cet email
                      </Button>
                    )}
                    {message.status === 'replied' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateMessageStatus(message.id, 'pending')}
                      >
                        Marquer comme non répondu
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
