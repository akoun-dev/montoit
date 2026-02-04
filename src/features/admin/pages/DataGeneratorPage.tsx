import { useState } from 'react';
import {
  Eye,
  ArrowLeft,
  Home,
  FileText,
  RefreshCw,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Loader2,
  Database,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';

interface GenerationResult {
  success: boolean;
  message: string;
  count?: number;
}

export default function DataGeneratorPage() {
  const { user } = useAuth();
  const [generating, setGenerating] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, GenerationResult>>({});

  const addResult = (key: string, result: GenerationResult) => {
    setResults((prev) => ({ ...prev, [key]: result }));
  };

  // Générer des propriétés de test
  const generateProperties = async () => {
    setGenerating('properties');
    try {
      // Utiliser l'utilisateur actuel comme propriétaire
      if (!user?.id) {
        addResult('properties', { success: false, message: 'Vous devez être connecté' });
        return;
      }

      const properties = [
        {
          title: 'Villa Moderne 4 Chambres',
          city: 'Abidjan',
          neighborhood: 'Cocody Angré',
          property_type: 'house',
          monthly_rent: 450000,
          bedrooms: 4,
          bathrooms: 3,
          surface_area: 250,
          status: 'disponible',
        },
        {
          title: 'Appartement 3 Pièces Vue Lagune',
          city: 'Abidjan',
          neighborhood: 'Marcory Zone 4',
          property_type: 'apartment',
          monthly_rent: 280000,
          bedrooms: 2,
          bathrooms: 2,
          surface_area: 95,
          status: 'disponible',
        },
        {
          title: 'Studio Meublé Centre-Ville',
          city: 'Abidjan',
          neighborhood: 'Plateau',
          property_type: 'studio',
          monthly_rent: 150000,
          bedrooms: 1,
          bathrooms: 1,
          surface_area: 35,
          status: 'disponible',
        },
        {
          title: 'Duplex Luxueux Riviera',
          city: 'Abidjan',
          neighborhood: 'Riviera Palmeraie',
          property_type: 'apartment',
          monthly_rent: 650000,
          bedrooms: 5,
          bathrooms: 4,
          surface_area: 320,
          status: 'disponible',
        },
        {
          title: 'Villa Familiale Bingerville',
          city: 'Bingerville',
          neighborhood: 'Centre',
          property_type: 'house',
          monthly_rent: 350000,
          bedrooms: 4,
          bathrooms: 2,
          surface_area: 200,
          status: 'disponible',
        },
        {
          title: 'Appartement Économique Yopougon',
          city: 'Abidjan',
          neighborhood: 'Yopougon Niangon',
          property_type: 'apartment',
          monthly_rent: 85000,
          bedrooms: 2,
          bathrooms: 1,
          surface_area: 55,
          status: 'disponible',
        },
        {
          title: 'Penthouse Premium II Plateaux',
          city: 'Abidjan',
          neighborhood: 'Cocody II Plateaux',
          property_type: 'apartment',
          monthly_rent: 950000,
          bedrooms: 4,
          bathrooms: 3,
          surface_area: 280,
          status: 'disponible',
        },
        {
          title: 'Maison Traditionnelle Rénovée',
          city: 'Yamoussoukro',
          neighborhood: 'Centre',
          property_type: 'house',
          monthly_rent: 180000,
          bedrooms: 3,
          bathrooms: 2,
          surface_area: 150,
          status: 'disponible',
        },
        {
          title: 'Appartement Standing Deux Plateaux',
          city: 'Abidjan',
          neighborhood: 'Deux Plateaux Vallon',
          property_type: 'apartment',
          monthly_rent: 420000,
          bedrooms: 3,
          bathrooms: 2,
          surface_area: 120,
          status: 'loue',
        },
        {
          title: 'Villa avec Piscine Riviera 3',
          city: 'Abidjan',
          neighborhood: 'Riviera 3',
          property_type: 'house',
          monthly_rent: 800000,
          bedrooms: 5,
          bathrooms: 4,
          surface_area: 400,
          status: 'disponible',
        },
      ];

      let count = 0;
      for (const prop of properties) {
        const { error } = await supabase.from('properties').insert({
          owner_id: user.id,
          title: prop.title,
          city: prop.city,
          neighborhood: prop.neighborhood,
          property_type: prop.property_type,
          monthly_rent: prop.monthly_rent,
          bedrooms: prop.bedrooms,
          bathrooms: prop.bathrooms,
          surface_area: prop.surface_area,
          status: prop.status,
          address: `${prop.neighborhood}, ${prop.city}`,
          deposit_amount: prop.monthly_rent * 2,
          furnished: Math.random() > 0.5,
          has_parking: Math.random() > 0.3,
          has_garden: prop.property_type === 'house' && Math.random() > 0.5,
          has_ac: Math.random() > 0.4,
          latitude: 5.3364 + (Math.random() - 0.5) * 0.1,
          longitude: -4.0266 + (Math.random() - 0.5) * 0.1,
          description: `Magnifique ${prop.property_type === 'house' ? 'villa' : prop.property_type} situé(e) à ${prop.neighborhood}. Idéal pour ${prop.bedrooms > 2 ? 'famille' : 'couple ou professionnel'}. Proche des commodités.`,
        });

        if (!error) count++;
      }

      addResult('properties', { success: true, message: `${count} propriétés créées`, count });
    } catch (error) {
      addResult('properties', { success: false, message: `Erreur: ${error}` });
    } finally {
      setGenerating(null);
    }
  };

  // Générer des contrats de bail
  const generateLeases = async () => {
    setGenerating('leases');
    try {
      if (!user?.id) {
        addResult('leases', { success: false, message: 'Vous devez être connecté' });
        return;
      }

      // Récupérer les propriétés de l'utilisateur
      const { data: properties } = await supabase
        .from('properties')
        .select('id, monthly_rent, title')
        .eq('owner_id', user.id)
        .eq('status', 'disponible')
        .limit(5);

      if (!properties || properties.length === 0) {
        addResult('leases', {
          success: false,
          message: "Aucune propriété disponible. Créez d'abord des propriétés.",
        });
        return;
      }

      const leaseStatuses = [
        { status: 'brouillon', description: 'Brouillon - PDF non généré' },
        { status: 'en_attente_signature', description: 'En attente de signature' },
        { status: 'actif', description: 'Actif - signé par tous' },
        { status: 'signature_electronique_pending', description: 'Signature CryptoNeo en cours' },
      ];

      let count = 0;
      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);

      for (let i = 0; i < Math.min(properties.length, leaseStatuses.length); i++) {
        const prop = properties[i];
        const leaseStatus = leaseStatuses[i];

        if (!prop || !leaseStatus) continue;

        const contractNumber = `MT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(count + 1).padStart(5, '0')}`;

        const insertData: Record<string, unknown> = {
          contract_number: contractNumber,
          property_id: prop.id,
          owner_id: user.id,
          tenant_id: user.id, // Utiliser le même utilisateur comme locataire pour test
          status: leaseStatus.status,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          monthly_rent: prop.monthly_rent,
          deposit_amount: prop.monthly_rent * 2,
          charges_amount: Math.round(prop.monthly_rent * 0.1),
          payment_day: 5,
        };

        // Ajouter les signatures selon le statut
        if (leaseStatus.status === 'actif') {
          insertData['owner_signed_at'] = new Date().toISOString();
          insertData['tenant_signed_at'] = new Date().toISOString();
          insertData['signed_at'] = new Date().toISOString();
        }
        if (leaseStatus.status === 'signature_electronique_pending') {
          insertData['cryptoneo_operation_id'] = `CRYPTO-TEST-${Date.now()}`;
        }

        const { error } = await supabase.from('lease_contracts').insert(insertData as never);

        if (!error) count++;
      }

      addResult('leases', {
        success: true,
        message: `${count} contrats créés avec différents statuts de signature`,
        count,
      });
    } catch (error) {
      addResult('leases', { success: false, message: `Erreur: ${error}` });
    } finally {
      setGenerating(null);
    }
  };

  // Générer des paiements
  const generatePayments = async () => {
    setGenerating('payments');
    try {
      if (!user?.id) {
        addResult('payments', { success: false, message: 'Vous devez être connecté' });
        return;
      }

      const { data: leases } = await supabase
        .from('lease_contracts')
        .select('id, tenant_id, owner_id, monthly_rent, property_id')
        .eq('status', 'actif')
        .limit(3);

      if (!leases || leases.length === 0) {
        addResult('payments', {
          success: false,
          message: "Aucun contrat actif. Créez d'abord des contrats.",
        });
        return;
      }

      const paymentStatuses = ['completed', 'pending', 'failed'];
      let count = 0;

      for (const lease of leases) {
        for (let month = 0; month < 3; month++) {
          const dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() - month);

          const status =
            month === 0 ? 'pending' : (paymentStatuses[Math.floor(Math.random() * 2)] ?? 'pending');

          const { error } = await supabase.from('payments').insert({
            contract_id: lease.id,
            property_id: lease.property_id,
            tenant_id: lease.tenant_id,
            amount: lease.monthly_rent,
            payment_type: 'loyer',
            status,
            due_date: dueDate.toISOString().split('T')[0],
            paid_at: status === 'completed' ? dueDate.toISOString() : null,
            payment_method: status === 'completed' ? 'mobile_money' : null,
            transaction_id: status === 'completed' ? `TXN-${Date.now()}-${count}` : null,
          });

          if (!error) count++;
        }
      }

      addResult('payments', { success: true, message: `${count} paiements créés`, count });
    } catch (error) {
      addResult('payments', { success: false, message: `Erreur: ${error}` });
    } finally {
      setGenerating(null);
    }
  };

  // Mettre à jour le profil avec différents niveaux de vérification
  const updateProfileVerification = async (level: 'none' | 'oneci' | 'oneci_cnam' | 'full') => {
    setGenerating(`profile_${level}`);
    try {
      if (!user?.id) {
        addResult(`profile_${level}`, { success: false, message: 'Vous devez être connecté' });
        return;
      }

      const updates: Record<string, unknown> = {};

      switch (level) {
        case 'none':
          updates['oneci_verified'] = false;
          updates['cnam_verified'] = false;
          updates['facial_verification_status'] = 'pending';
          updates['is_verified'] = false;
          updates['trust_score'] = 20;
          break;
        case 'oneci':
          updates['oneci_verified'] = true;
          updates['cnam_verified'] = false;
          updates['facial_verification_status'] = 'pending';
          updates['is_verified'] = false;
          updates['trust_score'] = 45;
          break;
        case 'oneci_cnam':
          updates['oneci_verified'] = true;
          updates['cnam_verified'] = true;
          updates['facial_verification_status'] = 'pending';
          updates['is_verified'] = false;
          updates['trust_score'] = 65;
          break;
        case 'full':
          updates['oneci_verified'] = true;
          updates['cnam_verified'] = true;
          updates['facial_verification_status'] = 'verified';
          updates['is_verified'] = true;
          updates['trust_score'] = 92;
          break;
      }

      const { error } = await supabase.from('profiles').update(updates).eq('user_id', user.id);

      if (error) throw error;

      const labels: Record<string, string> = {
        none: 'Non vérifié',
        oneci: 'ONECI seulement',
        oneci_cnam: 'ONECI + CNAM',
        full: 'Complètement vérifié',
      };

      addResult(`profile_${level}`, {
        success: true,
        message: `Profil mis à jour: ${labels[level]}`,
      });
    } catch (error) {
      addResult(`profile_${level}`, { success: false, message: `Erreur: ${error}` });
    } finally {
      setGenerating(null);
    }
  };

  // Générer le scénario complet
  const generateFullScenario = async () => {
    setGenerating('full');
    try {
      await generateProperties();
      await new Promise((r) => setTimeout(r, 500));
      await generateLeases();
      await new Promise((r) => setTimeout(r, 500));
      await generatePayments();

      addResult('full', { success: true, message: 'Scénario complet généré avec succès!' });
    } catch (error) {
      addResult('full', { success: false, message: `Erreur: ${error}` });
    } finally {
      setGenerating(null);
    }
  };

  // Nettoyer les données de test
  const cleanupTestData = async () => {
    if (
      !confirm(
        '⚠️ Supprimer TOUTES vos données de test (propriétés, contrats, paiements)? Cette action est irréversible.'
      )
    )
      return;

    setGenerating('cleanup');
    try {
      if (!user?.id) {
        addResult('cleanup', { success: false, message: 'Vous devez être connecté' });
        return;
      }

      // Supprimer dans l'ordre inverse des dépendances
      await supabase.from('payments').delete().eq('tenant_id', user.id);
      await supabase.from('lease_contracts').delete().eq('owner_id', user.id);
      await supabase.from('properties').delete().eq('owner_id', user.id);

      addResult('cleanup', { success: true, message: 'Données de test supprimées' });
    } catch (error) {
      addResult('cleanup', { success: false, message: `Erreur: ${error}` });
    } finally {
      setGenerating(null);
    }
  };

  const ResultBadge = ({ result }: { result?: GenerationResult }) => {
    if (!result) return null;
    return (
      <div
        className={`flex items-center gap-2 text-sm mt-2 ${result.success ? 'text-green-600' : 'text-red-600'}`}
      >
        {result.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
        <span>{result.message}</span>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Veuillez vous connecter en tant qu'admin</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <Database className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Data Generator</h1>
            <p className="text-muted-foreground">
              Génération de données de test pour tester les fonctionnalités métier
            </p>
          </div>
        </div>
        <Link to="/admin/tableau-de-bord">
          <Button variant="outline" className="gap-2">
            Retour au Dashboard
          </Button>
        </Link>
      </div>

      {/* Warning Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <p className="text-amber-800 font-medium">
            ⚠️ Outil de développement - Les données générées permettent de tester : Signature
            électronique (CryptoNeo), Vérification faciale (NeoFace), Parcours complet
            locataire/propriétaire
          </p>
        </div>
      </div>

      {/* Generation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Propriétés */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Home className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Propriétés</h3>
              <p className="text-sm text-muted-foreground">10 biens variés</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Villas, appartements, studios dans différentes villes et quartiers.
          </p>
          <Button onClick={generateProperties} disabled={generating !== null} className="w-full">
            {generating === 'properties' ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Home className="w-4 h-4 mr-2" />
            )}
            Générer Propriétés
          </Button>
          <ResultBadge result={results['properties']} />
        </div>

        {/* Contrats */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Contrats de Bail</h3>
              <p className="text-sm text-muted-foreground">Différents statuts signature</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Brouillon, en attente, partiellement signé, actif, signature CryptoNeo pending.
          </p>
          <Button onClick={generateLeases} disabled={generating !== null} className="w-full">
            {generating === 'leases' ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <FileText className="w-4 h-4 mr-2" />
            )}
            Générer Contrats
          </Button>
          <ResultBadge result={results['leases']} />
        </div>

        {/* Paiements */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Paiements</h3>
              <p className="text-sm text-muted-foreground">Historique de loyers</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Paiements effectués, en attente et échoués pour chaque contrat actif.
          </p>
          <Button onClick={generatePayments} disabled={generating !== null} className="w-full">
            {generating === 'payments' ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <CreditCard className="w-4 h-4 mr-2" />
            )}
            Générer Paiements
          </Button>
          <ResultBadge result={results['payments']} />
        </div>

        {/* Scénario Complet */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Scénario Complet</h3>
              <p className="text-sm text-muted-foreground">Tout en un clic</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Génère propriétés, contrats et paiements en séquence.
          </p>
          <Button
            onClick={generateFullScenario}
            disabled={generating !== null}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {generating === 'full' ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Générer Tout
          </Button>
          <ResultBadge result={results['full']} />
        </div>
      </div>

      {/* Profile Verification Level */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Niveau de vérification du profil</h3>
            <p className="text-sm text-muted-foreground">
              Modifier votre niveau de vérification pour tester différents scénarios
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button
            onClick={() => updateProfileVerification('none')}
            disabled={generating !== null}
            variant="outline"
            className="flex-col h-auto py-3"
          >
            {generating === 'profile_none' && <Loader2 className="w-4 h-4 animate-spin mb-1" />}
            <span className="text-xs">Non vérifié</span>
            <span className="text-xs text-muted-foreground">Score: 20</span>
          </Button>
          <Button
            onClick={() => updateProfileVerification('oneci')}
            disabled={generating !== null}
            variant="outline"
            className="flex-col h-auto py-3"
          >
            {generating === 'profile_oneci' && <Loader2 className="w-4 h-4 animate-spin mb-1" />}
            <span className="text-xs">ONECI seulement</span>
            <span className="text-xs text-muted-foreground">Score: 45</span>
          </Button>
          <Button
            onClick={() => updateProfileVerification('oneci_cnam')}
            disabled={generating !== null}
            variant="outline"
            className="flex-col h-auto py-3"
          >
            {generating === 'profile_oneci_cnam' && (
              <Loader2 className="w-4 h-4 animate-spin mb-1" />
            )}
            <span className="text-xs">ONECI + CNAM</span>
            <span className="text-xs text-muted-foreground">Score: 65</span>
          </Button>
          <Button
            onClick={() => updateProfileVerification('full')}
            disabled={generating !== null}
            variant="outline"
            className="flex-col h-auto py-3 border-green-300 text-green-700"
          >
            {generating === 'profile_full' && <Loader2 className="w-4 h-4 animate-spin mb-1" />}
            <span className="text-xs">Vérifié complet</span>
            <span className="text-xs text-muted-foreground">Score: 92</span>
          </Button>
        </div>
        {['none', 'oneci', 'oneci_cnam', 'full'].map((level) => (
          <ResultBadge key={level} result={results[`profile_${level}`]} />
        ))}
      </div>

      {/* Cleanup Section */}
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-900">Nettoyer les données de test</h3>
              <p className="text-sm text-red-700">
                Supprime toutes vos propriétés, contrats et paiements
              </p>
            </div>
          </div>
          <Button
            onClick={cleanupTestData}
            disabled={generating !== null}
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            {generating === 'cleanup' ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Nettoyer
          </Button>
        </div>
        <ResultBadge result={results['cleanup']} />
      </div>

      {/* Test Instructions */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Comment tester les fonctionnalités
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-medium text-foreground mb-2">
              🔐 Signature Électronique (CryptoNeo)
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Générer des contrats avec le bouton ci-dessus</li>
              <li>Aller sur un contrat "en_attente_signature"</li>
              <li>Cliquer sur "Signer électroniquement"</li>
              <li>Recevoir l'OTP et valider</li>
            </ol>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-2">👤 Vérification Faciale (NeoFace)</h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Mettre votre profil en "ONECI + CNAM"</li>
              <li>Aller sur Mon Profil → Vérifications</li>
              <li>Lancer la vérification faciale</li>
              <li>Prendre un selfie et comparer avec CNI</li>
            </ol>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-2">📝 Parcours Candidature</h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Mettre votre profil "Vérifié complet"</li>
              <li>Rechercher une propriété disponible</li>
              <li>Postuler avec lettre de motivation</li>
              <li>Attendre validation propriétaire</li>
            </ol>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-2">💰 Paiement de Loyer</h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Créer un contrat actif</li>
              <li>Générer des paiements</li>
              <li>Aller sur Mes Paiements</li>
              <li>Payer un loyer en attente</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
