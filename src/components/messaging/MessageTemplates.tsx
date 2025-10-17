import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { FileText, Plus, Trash2, Edit } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { logger } from '@/services/logger';

interface Template {
  id: string;
  name: string;
  content: string;
}

interface MessageTemplatesProps {
  onUseTemplate: (content: string) => void;
}

const MessageTemplates = ({ onUseTemplate }: MessageTemplatesProps) => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [open, setOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateContent, setTemplateContent] = useState('');

  useEffect(() => {
    if (user) {
      fetchTemplates();
    }
  }, [user]);

  const fetchTemplates = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.logError(error, { context: 'MessageTemplates', action: 'fetch' });
    } else {
      setTemplates(data || []);
    }
  };

  const saveTemplate = async () => {
    if (!user || !templateName.trim() || !templateContent.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from('message_templates')
          .update({
            name: templateName,
            content: templateContent,
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;

        toast({
          title: 'Modèle mis à jour',
          description: 'Votre modèle a été mis à jour avec succès',
        });
      } else {
        const { error } = await supabase
          .from('message_templates')
          .insert({
            user_id: user.id,
            name: templateName,
            content: templateContent,
          });

        if (error) throw error;

        toast({
          title: 'Modèle créé',
          description: 'Votre modèle a été créé avec succès',
        });
      }

      fetchTemplates();
      resetForm();
      setOpen(false);
    } catch (error) {
      logger.logError(error, { context: 'MessageTemplates', action: 'save' });
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder le modèle',
        variant: 'destructive',
      });
    }
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase
      .from('message_templates')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le modèle',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Modèle supprimé',
        description: 'Le modèle a été supprimé avec succès',
      });
      fetchTemplates();
    }
  };

  const resetForm = () => {
    setTemplateName('');
    setTemplateContent('');
    setEditingTemplate(null);
  };

  const openEditDialog = (template: Template) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateContent(template.content);
    setOpen(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Modèles de messages
        </h3>
        <Dialog open={open} onOpenChange={(open) => { setOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Nouveau
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Modifier le modèle' : 'Nouveau modèle'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nom du modèle</label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Ex: Demande de visite"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Contenu</label>
                <Textarea
                  value={templateContent}
                  onChange={(e) => setTemplateContent(e.target.value)}
                  placeholder="Tapez votre message..."
                  rows={5}
                />
              </div>
              <Button onClick={saveTemplate} className="w-full">
                {editingTemplate ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="h-40">
        {templates.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun modèle enregistré
          </p>
        ) : (
          <div className="space-y-2">
            {templates.map((template) => (
              <Card key={template.id} className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => onUseTemplate(template.content)}
                        className="text-left w-full"
                      >
                        <p className="font-medium text-sm truncate">{template.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {template.content}
                        </p>
                      </button>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditDialog(template)}
                        className="h-7 w-7"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteTemplate(template.id)}
                        className="h-7 w-7 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default MessageTemplates;
