import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface PropertyWorkStatusProps {
  form: UseFormReturn<any>;
}

export const PropertyWorkStatus = ({ form }: PropertyWorkStatusProps) => {
  const workStatus = form.watch("work_status");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          État des travaux
        </CardTitle>
        <CardDescription>
          Informez les locataires potentiels de l'état du bien
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="work_status"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Travaux nécessaires ?</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-2"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="aucun_travail" />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                      Aucun travail - Logement prêt à occuper
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="travaux_a_effectuer" />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      Travaux à effectuer avant emménagement
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {workStatus === "travaux_a_effectuer" && (
          <div className="space-y-4 pt-4 border-t animate-fade-in">
            <FormField
              control={form.control}
              name="work_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description des travaux *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Décrivez en détail les travaux à effectuer : peinture, plomberie, électricité, etc."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Soyez transparent sur la nature et l'ampleur des travaux
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="work_images"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Photos de l'état actuel</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {(field.value || []).map((url: string, index: number) => (
                          <div key={index} className="relative group">
                            <img
                              src={url}
                              alt={`Travaux ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                const filtered = (field.value || []).filter((_: string, i: number) => i !== index);
                                field.onChange(filtered);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      
                      {(field.value || []).length < 5 && (
                        <div>
                          <Input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              // Simuler upload - en production, utiliser un vrai service d'upload
                              files.forEach((file) => {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const currentImages = field.value || [];
                                  if (currentImages.length < 5) {
                                    field.onChange([...currentImages, event.target?.result as string]);
                                  }
                                };
                                reader.readAsDataURL(file);
                              });
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Photos montrant les zones nécessitant des travaux (maximum 5 photos)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Estimations optionnelles */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-4 mt-4">
              <h4 className="font-semibold text-sm">Estimations (optionnel)</h4>
              
              <FormField
                control={form.control}
                name="work_estimated_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coût estimé (FCFA)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Ex: 500000"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormDescription>
                      Estimation du coût total des travaux
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="work_estimated_duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durée estimée</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: 2 semaines, 1 mois" 
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Temps nécessaire pour réaliser les travaux
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="work_start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de début prévue</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Date prévue pour commencer les travaux
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
