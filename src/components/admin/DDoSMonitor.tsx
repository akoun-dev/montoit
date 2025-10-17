import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Shield, ShieldAlert, Unlock, Ban, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { logger } from '@/services/logger';

interface BlockedIP {
  id: string;
  ip_address: string;
  reason: string;
  blocked_at: string;
  blocked_until: string | null;
  notes: string | null;
}

interface DDoSPattern {
  ip_address: string;
  request_count: number;
  time_window: string;
  endpoints_targeted: string[];
  first_request: string;
  last_request: string;
}

export const DDoSMonitor = () => {
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [ddosPatterns, setDDoSPatterns] = useState<DDoSPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [blockIP, setBlockIP] = useState('');
  const [blockReason, setBlockReason] = useState('manual_block');
  const [blockDuration, setBlockDuration] = useState('24');
  const { toast } = useToast();

  const loadBlockedIPs = async () => {
    const { data, error } = await supabase
      .from('blocked_ips')
      .select('*')
      .order('blocked_at', { ascending: false });

    if (error) {
      logger.error('Error loading blocked IPs', { error });
      return;
    }

    setBlockedIPs(data || []);
  };

  const loadDDoSPatterns = async () => {
    const { data, error } = await supabase.rpc('detect_ddos_pattern');

    if (error) {
      logger.error('Error detecting DDoS patterns', { error });
      return;
    }

    setDDoSPatterns(data || []);
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadBlockedIPs(), loadDDoSPatterns()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh toutes les 30s
    return () => clearInterval(interval);
  }, []);

  const handleBlockIP = async () => {
    if (!blockIP) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer une adresse IP",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase.rpc('block_ip', {
      _ip_address: blockIP,
      _reason: blockReason,
      _duration_hours: parseInt(blockDuration),
      _notes: `Blocage manuel depuis le dashboard`
    });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de bloquer l'IP",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "IP bloquée",
      description: `L'IP ${blockIP} a été bloquée pour ${blockDuration}h`
    });

    setBlockIP('');
    loadBlockedIPs();
  };

  const handleUnblockIP = async (ipAddress: string) => {
    const { error } = await supabase.rpc('unblock_ip', {
      _ip_address: ipAddress
    });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de débloquer l'IP",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "IP débloquée",
      description: `L'IP ${ipAddress} a été débloquée`
    });

    loadBlockedIPs();
  };

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case 'ddos_detected':
        return <Badge variant="destructive">DDoS Détecté</Badge>;
      case 'rate_limit_exceeded':
        return <Badge variant="secondary">Rate Limit</Badge>;
      case 'manual_block':
        return <Badge>Manuel</Badge>;
      default:
        return <Badge variant="outline">{reason}</Badge>;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Alertes DDoS */}
      {ddosPatterns.length > 0 && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Activité suspecte détectée !</AlertTitle>
          <AlertDescription>
            {ddosPatterns.length} adresse(s) IP montrent un pattern DDoS potentiel.
            Consultez la section "Patterns suspects" ci-dessous.
          </AlertDescription>
        </Alert>
      )}

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IPs Bloquées Actives</CardTitle>
            <Ban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {blockedIPs.filter(ip => !ip.blocked_until || new Date(ip.blocked_until) > new Date()).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patterns DDoS</CardTitle>
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{ddosPatterns.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total IPs Bloquées</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{blockedIPs.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Bloquer une IP manuellement */}
      <Card>
        <CardHeader>
          <CardTitle>Bloquer une IP manuellement</CardTitle>
          <CardDescription>Bloquez une adresse IP suspecte</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Input
              placeholder="Adresse IP (ex: 192.168.1.1)"
              value={blockIP}
              onChange={(e) => setBlockIP(e.target.value)}
            />
            <Select value={blockReason} onValueChange={setBlockReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual_block">Blocage manuel</SelectItem>
                <SelectItem value="abuse">Abus détecté</SelectItem>
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="security_threat">Menace sécurité</SelectItem>
              </SelectContent>
            </Select>
            <Select value={blockDuration} onValueChange={setBlockDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 heure</SelectItem>
                <SelectItem value="24">24 heures</SelectItem>
                <SelectItem value="168">7 jours</SelectItem>
                <SelectItem value="720">30 jours</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleBlockIP}>
              <Ban className="mr-2 h-4 w-4" />
              Bloquer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Patterns suspects */}
      {ddosPatterns.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Patterns Suspects (DDoS Potentiel)</CardTitle>
                <CardDescription>IPs avec plus de 100 requêtes/minute</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadDDoSPatterns}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ddosPatterns}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ip_address" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="request_count" fill="#ef4444" name="Requêtes" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Liste des IPs bloquées */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>IPs Bloquées</CardTitle>
              <CardDescription>Liste de toutes les adresses IP bloquées</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadBlockedIPs}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Adresse IP</TableHead>
                <TableHead>Raison</TableHead>
                <TableHead>Bloquée le</TableHead>
                <TableHead>Expire le</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blockedIPs.map((ip) => (
                <TableRow key={ip.id}>
                  <TableCell className="font-mono">{ip.ip_address}</TableCell>
                  <TableCell>{getReasonBadge(ip.reason)}</TableCell>
                  <TableCell>{new Date(ip.blocked_at).toLocaleString('fr-FR')}</TableCell>
                  <TableCell>
                    {ip.blocked_until ? (
                      new Date(ip.blocked_until) > new Date() ? (
                        <span className="text-destructive">
                          {new Date(ip.blocked_until).toLocaleString('fr-FR')}
                        </span>
                      ) : (
                        <Badge variant="outline">Expiré</Badge>
                      )
                    ) : (
                      <Badge variant="destructive">Permanent</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{ip.notes}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnblockIP(ip.ip_address)}
                    >
                      <Unlock className="h-4 w-4 mr-2" />
                      Débloquer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {blockedIPs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Aucune IP bloquée
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
