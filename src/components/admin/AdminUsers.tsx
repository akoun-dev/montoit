import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle } from 'lucide-react';
import { handleError } from '@/lib/errorHandler';

type User = {
  id: string;
  full_name: string;
  user_type: string;
  city: string | null;
  is_verified: boolean;
  oneci_verified: boolean;
  cnam_verified: boolean;
  created_at: string;
};

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      handleError(error, 'Impossible de charger les utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const getUserTypeBadge = (userType: string) => {
    const labels: Record<string, string> = {
      'locataire': 'Locataire',
      'proprietaire': 'Propriétaire',
      'agence': 'Agence',
      'admin_ansut': 'Admin ANSUT',
    };

    return <Badge variant="outline">{labels[userType] || userType}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestion des utilisateurs</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>ONECI</TableHead>
              <TableHead>CNAM</TableHead>
              <TableHead>Vérifié</TableHead>
              <TableHead>Date d'inscription</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Aucun utilisateur trouvé
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{getUserTypeBadge(user.user_type)}</TableCell>
                  <TableCell>{user.city || '-'}</TableCell>
                  <TableCell>
                    {user.oneci_verified ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell>
                    {user.cnam_verified ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell>
                    {user.is_verified ? (
                      <Badge variant="default">Vérifié</Badge>
                    ) : (
                      <Badge variant="secondary">Non vérifié</Badge>
                    )}
                  </TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString('fr-FR')}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default AdminUsers;
