import { UseFormReturn } from "react-hook-form";
import { PropertyFormData } from "./PropertyFormSchema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface PropertyPricingProps {
  form: UseFormReturn<PropertyFormData>;
}

export const PropertyPricing = ({ form }: PropertyPricingProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tarification</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="monthly_rent"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Loyer mensuel (FCFA)</FormLabel>
              <FormControl>
                <Input type="number" min="0" placeholder="250000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="deposit_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Caution (FCFA)</FormLabel>
              <FormControl>
                <Input type="number" min="0" placeholder="500000" {...field} />
              </FormControl>
              <FormDescription>
                Généralement équivalent à 2-3 mois de loyer
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};
