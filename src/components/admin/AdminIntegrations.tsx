import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Shield, Mail, CreditCard, Save, CheckCircle, XCircle, Scan } from "lucide-react";

interface IntegrationConfig {
  name: string;
  status: "configured" | "not_configured";
  icon: typeof Shield;
  description: string;
}

const AdminIntegrations = () => {
  const { toast } = useToast();
  
  // CinetPay Configuration
  const [cinetpayApiKey, setCinetpayApiKey] = useState("");
  const [cinetpaySiteId, setCinetpaySiteId] = useState("");
  const [cinetpaySecretKey, setCinetpaySecretKey] = useState("");
  
  // Brevo Configuration
  const [brevoApiKey, setBrevoApiKey] = useState("");
  
  // Azure Face API Configuration
  const [azureEndpoint, setAzureEndpoint] = useState("");
  const [azureApiKey, setAzureApiKey] = useState("");
  
  const integrations: IntegrationConfig[] = [
    {
      name: "CinetPay",
      status: "not_configured",
      icon: CreditCard,
      description: "Paiements Mobile Money (Orange, MTN, Wave, Moov)"
    },
    {
      name: "Brevo",
      status: "not_configured",
      icon: Mail,
      description: "Emails transactionnels et notifications"
    },
    {
      name: "Azure Face API",
      status: "configured",
      icon: Scan,
      description: "Vérification faciale biométrique"
    }
  ];

  const saveCinetPayConfig = async () => {
    if (!cinetpayApiKey || !cinetpaySiteId || !cinetpaySecretKey) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs CinetPay",
        variant: "destructive"
      });
      return;
    }

    try {
      // Store in localStorage for now (in production, this should be stored securely in Supabase)
      localStorage.setItem("cinetpay_config", JSON.stringify({
        apiKey: cinetpayApiKey,
        siteId: cinetpaySiteId,
        secretKey: cinetpaySecretKey,
        configuredAt: new Date().toISOString()
      }));

      toast({
        title: "Configuration sauvegardée",
        description: "Les paramètres CinetPay ont été enregistrés avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la configuration",
        variant: "destructive"
      });
    }
  };

  const saveBrevoConfig = async () => {
    if (!brevoApiKey) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir la clé API Brevo",
        variant: "destructive"
      });
      return;
    }

    try {
      localStorage.setItem("brevo_config", JSON.stringify({
        apiKey: brevoApiKey,
        configuredAt: new Date().toISOString()
      }));

      toast({
        title: "Configuration sauvegardée",
        description: "Les paramètres Brevo ont été enregistrés avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la configuration",
        variant: "destructive"
      });
    }
  };

  const saveAzureConfig = async () => {
    if (!azureEndpoint || !azureApiKey) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs Azure Face API",
        variant: "destructive"
      });
      return;
    }

    try {
      localStorage.setItem("azure_face_config", JSON.stringify({
        endpoint: azureEndpoint,
        apiKey: azureApiKey,
        configuredAt: new Date().toISOString()
      }));

      toast({
        title: "Configuration sauvegardée",
        description: "Les paramètres Azure Face API ont été enregistrés avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la configuration",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Intégrations</h2>
        <p className="text-muted-foreground">
          Gérez les intégrations et services externes de la plateforme
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          return (
            <Card key={integration.name}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {integration.name}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {integration.description}
                  </p>
                  <Badge 
                    variant={integration.status === "configured" ? "default" : "secondary"}
                    className="ml-2"
                  >
                    {integration.status === "configured" ? (
                      <CheckCircle className="mr-1 h-3 w-3" />
                    ) : (
                      <XCircle className="mr-1 h-3 w-3" />
                    )}
                    {integration.status === "configured" ? "Configuré" : "Non configuré"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Configuration Forms */}
      <Tabs defaultValue="cinetpay" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cinetpay">
            <CreditCard className="mr-2 h-4 w-4" />
            CinetPay
          </TabsTrigger>
          <TabsTrigger value="brevo">
            <Mail className="mr-2 h-4 w-4" />
            Brevo
          </TabsTrigger>
          <TabsTrigger value="azure">
            <Scan className="mr-2 h-4 w-4" />
            Azure Face API
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cinetpay" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration CinetPay</CardTitle>
              <CardDescription>
                Configurez vos clés API CinetPay pour activer les paiements Mobile Money
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cinetpay-api-key">Clé API</Label>
                <Input
                  id="cinetpay-api-key"
                  type="password"
                  placeholder="Votre clé API CinetPay"
                  value={cinetpayApiKey}
                  onChange={(e) => setCinetpayApiKey(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cinetpay-site-id">Site ID</Label>
                <Input
                  id="cinetpay-site-id"
                  placeholder="Votre Site ID CinetPay"
                  value={cinetpaySiteId}
                  onChange={(e) => setCinetpaySiteId(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cinetpay-secret">Clé secrète</Label>
                <Input
                  id="cinetpay-secret"
                  type="password"
                  placeholder="Votre clé secrète CinetPay"
                  value={cinetpaySecretKey}
                  onChange={(e) => setCinetpaySecretKey(e.target.value)}
                />
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h4 className="font-medium text-sm">Comment obtenir vos clés CinetPay ?</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Connectez-vous à votre compte CinetPay</li>
                  <li>Accédez à Paramètres → API</li>
                  <li>Copiez votre API Key, Site ID et Secret Key</li>
                  <li>Collez-les dans les champs ci-dessus</li>
                </ol>
              </div>

              <Button onClick={saveCinetPayConfig} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                Sauvegarder la configuration CinetPay
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brevo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Brevo</CardTitle>
              <CardDescription>
                Configurez votre clé API Brevo pour activer l'envoi d'emails transactionnels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brevo-api-key">Clé API Brevo</Label>
                <Input
                  id="brevo-api-key"
                  type="password"
                  placeholder="Votre clé API Brevo"
                  value={brevoApiKey}
                  onChange={(e) => setBrevoApiKey(e.target.value)}
                />
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h4 className="font-medium text-sm">Comment obtenir votre clé API Brevo ?</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Connectez-vous à votre compte Brevo (galadrim@ansut.ci)</li>
                  <li>Accédez à Paramètres → Clés API SMTP & API</li>
                  <li>Créez une nouvelle clé API ou copiez une clé existante</li>
                  <li>Collez-la dans le champ ci-dessus</li>
                </ol>
              </div>

              <Button onClick={saveBrevoConfig} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                Sauvegarder la configuration Brevo
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="azure" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Azure Face API</CardTitle>
              <CardDescription>
                Configurez votre endpoint et clé API Azure pour activer la vérification faciale
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="azure-endpoint">Endpoint Azure</Label>
                <Input
                  id="azure-endpoint"
                  placeholder="https://westeurope.api.cognitive.microsoft.com/"
                  value={azureEndpoint}
                  onChange={(e) => setAzureEndpoint(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="azure-api-key">Clé API Azure</Label>
                <Input
                  id="azure-api-key"
                  type="password"
                  placeholder="Votre clé API Azure Face"
                  value={azureApiKey}
                  onChange={(e) => setAzureApiKey(e.target.value)}
                />
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h4 className="font-medium text-sm">Configuration actuelle</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>✅ Endpoint: Configuré dans les secrets Lovable Cloud</p>
                  <p>✅ API Key: Configurée dans les secrets Lovable Cloud</p>
                  <p className="pt-2 text-xs">
                    Les clés Azure sont stockées de manière sécurisée dans Lovable Cloud.
                    Cette section est informative uniquement.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg space-y-2">
                <h4 className="font-medium text-sm">Fonctionnalités activées</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Vérification faciale optionnelle après ONECI</li>
                  <li>Seuil de similarité: 70%</li>
                  <li>Maximum 3 tentatives par jour par utilisateur</li>
                  <li>Badge "Face ID vérifié" sur les profils</li>
                </ul>
              </div>

              <Button onClick={saveAzureConfig} className="w-full" disabled>
                <Save className="mr-2 h-4 w-4" />
                Configuration gérée par Lovable Cloud
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminIntegrations;
