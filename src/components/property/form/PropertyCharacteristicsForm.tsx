import { UseFormReturn } from "react-hook-form";
import { PropertyFormData } from "./PropertyFormSchema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface PropertyCharacteristicsFormProps {
  form: UseFormReturn<PropertyFormData>;
}

export const PropertyCharacteristicsForm = ({ form }: PropertyCharacteristicsFormProps) => {
  const propertyType = form.watch("property_type");
  const isApartment = propertyType === "Appartement";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Caractéristiques</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="bedrooms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chambres</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bathrooms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Salles de bain</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="surface_area"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Surface (m²)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3">
          <FormLabel>Équipements</FormLabel>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="is_furnished"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal cursor-pointer">Meublé</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="has_ac"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal cursor-pointer">Climatisation</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="has_parking"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal cursor-pointer">Parking</FormLabel>
                </FormItem>
              )}
            />

            {!isApartment && (
              <FormField
                control={form.control}
                name="has_garden"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">Jardin</FormLabel>
                  </FormItem>
                )}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
