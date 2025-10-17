import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { getDeviceFingerprint } from '@/lib/ipUtils';
import { MessageCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { logger } from '@/services/logger';

const guestContactSchema = z.object({
  guestName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(100),
  guestEmail: z.string().email('Email invalide').max(255),
  guestPhone: z.string().optional(),
  message: z.string()
    .min(10, 'Le message doit contenir au moins 10 caractères')
    .max(1000, 'Le message ne doit pas dépasser 1000 caractères'),
  honeypot: z.string().optional(), // Champ anti-bot invisible
});

type GuestContactFormValues = z.infer<typeof guestContactSchema>;

interface GuestContactFormProps {
  propertyId: string;
  ownerId: string;
  propertyTitle: string;
}

export const GuestContactForm = ({ propertyId, ownerId, propertyTitle }: GuestContactFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const { toast } = useToast();

  const form = useForm<GuestContactFormValues>({
    resolver: zodResolver(guestContactSchema),
    defaultValues: {
      guestName: '',
      guestEmail: '',
      guestPhone: '',
      message: '',
      honeypot: '',
    },
  });

  // Vérifier le cooldown au chargement
  useEffect(() => {
    const lastSentKey = `guest_message_${propertyId}`;
    const lastSent = localStorage.getItem(lastSentKey);
    
    if (lastSent) {
      const timeSinceLastSent = Date.now() - parseInt(lastSent);
      const cooldownMs = 60000; // 60 secondes
      
      if (timeSinceLastSent < cooldownMs) {
        const remaining = Math.ceil((cooldownMs - timeSinceLastSent) / 1000);
        setCooldownSeconds(remaining);
      }
    }
  }, [propertyId]);

  // Décompte du cooldown
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => {
        setCooldownSeconds(cooldownSeconds - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  const onSubmit = async (values: GuestContactFormValues) => {
    // Vérifier le honeypot (anti-bot)
    if (values.honeypot) {
      logger.warn('Bot detected in guest contact form', { propertyId });
      return;
    }

    setIsSubmitting(true);

    try {
      // Appeler l'edge function
      const { data, error } = await supabase.functions.invoke('send-guest-message', {
        body: {
          propertyId,
          ownerId,
          guestName: values.guestName,
          guestEmail: values.guestEmail,
          guestPhone: values.guestPhone,
          message: values.message,
          honeypot: values.honeypot,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        // Erreur métier (rate limit, etc.)
        toast({
          title: 'Impossible d\'envoyer le message',
          description: data.error,
          variant: 'destructive',
        });

        // Si rate limit, gérer le cooldown
        if (data.retryAfter) {
          const retryDate = new Date(data.retryAfter);
          const waitSeconds = Math.ceil((retryDate.getTime() - Date.now()) / 1000);
          setCooldownSeconds(waitSeconds);
        }
        return;
      }

      // Succès
      setIsSuccess(true);
      form.reset();
      
      // Stocker l'heure d'envoi pour cooldown
      const lastSentKey = `guest_message_${propertyId}`;
      localStorage.setItem(lastSentKey, Date.now().toString());
      setCooldownSeconds(60);

      toast({
        title: 'Message envoyé !',
        description: 'Le propriétaire vous répondra par email.',
        variant: 'default',
      });

      // Réinitialiser le succès après 5 secondes
      setTimeout(() => {
        setIsSuccess(false);
      }, 5000);

    } catch (error: any) {
      logger.logError(error, { context: 'GuestContactForm', action: 'submit', propertyId });
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de l\'envoi du message',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = isSubmitting || cooldownSeconds > 0 || isSuccess;

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Contacter le propriétaire</h3>
      </div>

      {isSuccess ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
          <p className="text-lg font-medium text-foreground mb-2">Message envoyé !</p>
          <p className="text-sm text-muted-foreground">
            Le propriétaire vous répondra par email dans les plus brefs délais.
          </p>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="guestName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Votre nom *</FormLabel>
                  <FormControl>
                    <Input placeholder="Jean Dupont" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="guestEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Votre email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="jean@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="guestPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Votre téléphone (optionnel)</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+225 01 23 45 67 89" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Votre message *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={`Bonjour, je suis intéressé(e) par "${propertyTitle}". Pourriez-vous me donner plus d'informations ?`}
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    {field.value?.length || 0} / 1000 caractères
                  </p>
                </FormItem>
              )}
            />

            {/* Honeypot invisible (anti-bot) */}
            <FormField
              control={form.control}
              name="honeypot"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Input tabIndex={-1} autoComplete="off" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="pt-2">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isDisabled}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : cooldownSeconds > 0 ? (
                  <>Réessayer dans {cooldownSeconds}s</>
                ) : (
                  <>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Envoyer le message
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              En envoyant ce message, vous acceptez que vos données soient utilisées pour vous recontacter.
            </p>
          </form>
        </Form>
      )}
    </div>
  );
};
