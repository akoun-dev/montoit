import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Lock, CheckCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { logger } from "@/services/logger";

interface TitleDeedSectionProps {
  propertyId: string;
  titleDeedUrl?: string | null;
  ownerId: string;
}

export const TitleDeedSection = ({ propertyId, titleDeedUrl, ownerId }: TitleDeedSectionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [canAccess, setCanAccess] = useState(false);
  const [accessReason, setAccessReason] = useState<string>("");

  // ✅ CORRECTION : useEffect au lieu de useState
  useEffect(() => {
    const checkAccess = async () => {
      if (!user || !titleDeedUrl) {
        setLoading(false);
        return;
      }

      try {
        // Vérifier si propriétaire
        if (user.id === ownerId) {
          setCanAccess(true);
          setAccessReason("owner");
          setLoading(false);
          return;
        }

        // Vérifier si admin
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["admin", "super_admin"]);

        if (roles && roles.length > 0) {
          setCanAccess(true);
          setAccessReason("admin");
          setLoading(false);
          return;
        }

        // Vérifier si locataire actif
        const { data: lease, error } = await supabase
          .from("leases")
          .select("id, status")
          .eq("property_id", propertyId)
          .eq("tenant_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        if (error) throw error;

        if (lease) {
          setCanAccess(true);
          setAccessReason("tenant");
        }
      } catch (error) {
        logger.logError(error, { context: 'TitleDeedSection', action: 'checkAccess', propertyId });
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [user, titleDeedUrl, propertyId, ownerId]);

  const handleDownload = async () => {
    if (!titleDeedUrl || !canAccess) return;

    setDownloading(true);
    try {
      // ✅ Logger l'accès AVANT le téléchargement
      await supabase.from("title_deed_access_log").insert({
        property_id: propertyId,
        requester_id: user?.id,
        access_granted: true,
        access_reason: accessReason,
      });

      await supabase.from("admin_audit_logs").insert({
        admin_id: user?.id,
        action_type: "title_deed_accessed",
        target_type: "property",
        target_id: propertyId,
        notes: `Accès titre de propriété (raison: ${accessReason})`,
      });

      // ✅ SÉCURISÉ : Utiliser signedUrl avec expiration si c'est dans le bucket
      if (titleDeedUrl.includes('property-documents')) {
        const pathParts = titleDeedUrl.split('/property-documents/')[1];
        const { data, error } = await supabase.storage
          .from('property-documents')
          .createSignedUrl(pathParts, 60);

        if (error) throw error;
        window.open(data.signedUrl, "_blank");
      } else {
        // Ancien système (URL directe)
        window.open(titleDeedUrl, "_blank");
      }
      
      toast({
        title: "✅ Accès autorisé",
        description: "Le titre de propriété s'ouvrira dans un nouvel onglet",
      });
    } catch (error: any) {
      logger.logError(error, { context: 'TitleDeedSection', action: 'download', propertyId });
      
      // Logger échec
      await supabase.from("title_deed_access_log").insert({
        property_id: propertyId,
        requester_id: user?.id,
        access_granted: false,
        access_reason: `denied: ${error.message}`,
      });
      
      // Gestion des erreurs RLS
      if (error.message?.includes("RLS") || error.message?.includes("policy")) {
        toast({
          title: "🔒 Accès refusé",
          description: "Vous n'avez pas les droits pour accéder à ce document",
          variant: "destructive",
        });
      } else {
        toast({
          title: "❌ Erreur",
          description: "Impossible de télécharger le titre de propriété",
          variant: "destructive",
        });
      }
    } finally {
      setDownloading(false);
    }
  };

  if (!titleDeedUrl) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Titre de propriété
        </CardTitle>
        <CardDescription>
          Document officiel attestant de la propriété du bien
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : canAccess ? (
          <div className="space-y-4">
            <Alert className="border-success bg-success/10">
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription>
                {accessReason === "tenant" 
                  ? "En tant que locataire actif, vous avez accès au titre de propriété"
                  : accessReason === "admin"
                  ? "En tant qu'administrateur, vous avez accès au titre de propriété"
                  : "En tant que propriétaire, vous avez accès au titre de propriété"}
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={handleDownload}
              disabled={downloading}
              className="w-full"
            >
              {downloading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Chargement...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger le titre de propriété
                </>
              )}
            </Button>
          </div>
        ) : (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              Le titre de propriété est accessible uniquement :
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Au propriétaire du bien</li>
                <li>Aux locataires ayant un bail actif</li>
                <li>Aux administrateurs de la plateforme</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
