import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { logger } from "@/services/logger";

interface ValidationCheck {
  check_name: string;
  label: string;
  passed: boolean;
  message: string;
}

interface ValidationResult {
  lease_id: string;
  checks: ValidationCheck[];
  all_passed: boolean;
  validated_at: string;
}

interface PreCertificationChecklistProps {
  leaseId: string;
}

export const PreCertificationChecklist = ({ leaseId }: PreCertificationChecklistProps) => {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    validateLease();
  }, [leaseId]);

  const validateLease = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('pre_validate_lease_for_certification', {
        p_lease_id: leaseId
      });

      if (error) throw error;
      setValidation(data as unknown as ValidationResult);
    } catch (error) {
      logger.logError(error, { context: 'PreCertificationChecklist', action: 'validate' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!validation) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {validation.all_passed ? (
            <CheckCircle2 className="h-5 w-5 text-success" />
          ) : (
            <XCircle className="h-5 w-5 text-destructive" />
          )}
          Vérifications pré-certification
        </CardTitle>
        <CardDescription>
          {validation.all_passed 
            ? "Tous les critères sont remplis pour la certification ANSUT" 
            : "Certains critères doivent être complétés avant la certification"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {validation.checks.map((check, index) => (
          <div 
            key={check.check_name} 
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg border animate-fade-in",
              check.passed && "border-green-600/20 bg-green-50/50 dark:bg-green-950/20"
            )}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {check.passed ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5 animate-scale-in" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-1">
              <p className="font-medium">{check.label}</p>
              <p className="text-sm text-muted-foreground">{check.message}</p>
            </div>
          </div>
        ))}
        
        {!validation.all_passed && (
          <Alert>
            <AlertDescription>
              Complétez les critères manquants avant de demander la certification ANSUT.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};