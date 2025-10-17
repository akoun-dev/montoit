import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { DynamicBreadcrumb } from '@/components/navigation/DynamicBreadcrumb';
import { FormStepper, type Step } from '@/components/forms/FormStepper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, Calendar as CalendarIcon, Clock, MapPin, Home } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const visitSteps: Step[] = [
  { id: 'property', label: 'Sélection de la propriété' },
  { id: 'schedule', label: 'Date et heure de visite' },
  { id: 'confirmation', label: 'Confirmation' }
];

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', 
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00'
];

const ScheduleVisit = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [property, setProperty] = useState<any>(null);

  // Load property details
  useState(() => {
    const loadProperty = async () => {
      if (!propertyId) return;
      
      const { data, error } = await supabase
        .from('properties')
        .select('*, profiles:owner_id(full_name)')
        .eq('id', propertyId)
        .single();
      
      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de charger le bien",
          variant: "destructive",
        });
        return;
      }
      
      setProperty(data);
    };
    
    loadProperty();
  });

  const handleSubmit = async () => {
    if (!user || !propertyId || !selectedDate || !selectedTime) return;

    setLoading(true);
    try {
      // Create visit request message
      const visitDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':');
      visitDateTime.setHours(parseInt(hours), parseInt(minutes));

      const messageContent = `🏠 Demande de visite pour le bien\n\n📅 Date : ${format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}\n⏰ Heure : ${selectedTime}\n\n💬 Message :\n${comments || 'Aucun commentaire additionnel'}`;

      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: property.owner_id,
          property_id: propertyId,
          content: messageContent,
          message_type: 'visit_request'
        });

      if (error) throw error;

      toast({
        title: "Demande envoyée !",
        description: "Le propriétaire a reçu votre demande de visite",
      });

      navigate(`/property/${propertyId}`);
    } catch (error) {
      console.error('Error scheduling visit:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la demande",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const canGoNext = () => {
    if (currentStep === 0) return !!property;
    if (currentStep === 1) return !!selectedDate && !!selectedTime;
    return false;
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        <div className="max-w-4xl mx-auto">
          <DynamicBreadcrumb />
          
          <h1 className="text-3xl font-bold mb-6">Demander une visite</h1>

          <FormStepper steps={visitSteps} currentStep={currentStep} />

          <div className="mt-6 space-y-6">
            {/* Step 1: Property Selection */}
            {currentStep === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Propriété sélectionnée</CardTitle>
                  <CardDescription>Vérifiez les détails du bien à visiter</CardDescription>
                </CardHeader>
                <CardContent>
                  {property ? (
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        {property.main_image && (
                          <img 
                            src={property.main_image} 
                            alt={property.title}
                            className="w-32 h-32 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{property.title}</h3>
                          <div className="flex items-center gap-2 text-muted-foreground mt-2">
                            <MapPin className="w-4 h-4" />
                            <span>{property.city}, {property.neighborhood}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground mt-1">
                            <Home className="w-4 h-4" />
                            <span>{property.property_type}</span>
                          </div>
                          <p className="text-primary font-bold mt-2">
                            {property.price.toLocaleString()} FCFA/mois
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 2: Date & Time Selection */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5" />
                      Sélectionnez une date
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      locale={fr}
                      disabled={(date) => date < new Date() || date < new Date(new Date().setHours(0, 0, 0, 0))}
                      className="rounded-md border"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Choisissez un créneau horaire
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                      {timeSlots.map((time) => (
                        <Button
                          key={time}
                          variant={selectedTime === time ? 'default' : 'outline'}
                          onClick={() => setSelectedTime(time)}
                          className="min-h-[44px]"
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Commentaires additionnels</CardTitle>
                    <CardDescription>Informations complémentaires pour le propriétaire (optionnel)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Ex: Je souhaiterais visiter avec mon conjoint..."
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      rows={4}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 3: Confirmation */}
            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Récapitulatif de votre demande</CardTitle>
                  <CardDescription>Vérifiez les informations avant d'envoyer</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Bien concerné</h4>
                    <p>{property?.title}</p>
                    <p className="text-sm text-muted-foreground">{property?.city}, {property?.neighborhood}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Date et heure</h4>
                    <p>{selectedDate && format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}</p>
                    <p className="text-sm text-muted-foreground">à {selectedTime}</p>
                  </div>
                  
                  {comments && (
                    <div>
                      <h4 className="font-semibold mb-2">Commentaires</h4>
                      <p className="text-sm">{comments}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => currentStep > 0 ? setCurrentStep(currentStep - 1) : navigate(-1)}
                disabled={loading}
                className="flex-1 min-h-[44px]"
              >
                {currentStep === 0 ? 'Annuler' : 'Précédent'}
              </Button>
              
              {currentStep < visitSteps.length - 1 ? (
                <Button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={!canGoNext()}
                  className="flex-1 min-h-[44px]"
                >
                  Suivant
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !selectedDate || !selectedTime}
                  className="flex-1 min-h-[44px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    'Confirmer la visite'
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ScheduleVisit;
