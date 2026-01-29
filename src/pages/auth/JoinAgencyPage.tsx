/**
 * Join Agency Page
 *
 * Allows agents to accept an invitation to join an agency.
 * Route: /rejoindre-agence?token=xxx
 *
 * Flow:
 * 1. Validate the token from URL
 * 2. Show agency details
 * 3. If authenticated, accept invitation
 * 4. If not authenticated, show login/register form
 * 5. After auth, accept invitation and redirect to agent dashboard
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { Card, CardContent } from '@/shared/ui';
import { Button, Input, Label } from '@/shared/ui';
import { Building2, CheckCircle, XCircle, Mail, Lock, User } from 'lucide-react';
import { toast } from 'sonner';
import { agentInvitationService } from '@/features/agency/services/agentInvitation.service';

interface InvitationDetails {
  agency_id: string;
  email: string;
  role: string;
  commission_split: number;
  target_monthly: number;
}

interface AgencyDetails {
  id: string;
  name: string;
  logo_url: string | null;
}

export default function JoinAgencyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signIn, signUp } = useAuth();

  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [agency, setAgency] = useState<AgencyDetails | null>(null);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      setLoading(false);
      setValidating(false);
      toast.error('Token d\'invitation manquant');
      return;
    }

    setToken(tokenParam);
    validateToken(tokenParam);
  }, [searchParams]);

  // If user is already authenticated, auto-accept the invitation
  useEffect(() => {
    if (user && invitation && !accepting) {
      acceptInvitation();
    }
  }, [user, invitation]);

  const validateToken = async (tokenParam: string) => {
    setValidating(true);
    try {
      const result = await agentInvitationService.validateInvitation(tokenParam);

      if (!result.valid) {
        toast.error(result.error || 'Invitation invalide');
        setInvitation(null);
        setValidating(false);
        setLoading(false);
        return;
      }

      setInvitation(result.data!);
      setEmail(result.data!.email);

      // Load agency details
      const { data: agencyData } = await supabase
        .from('agencies')
        .select('id, name, logo_url')
        .eq('id', result.data!.agency_id)
        .single();

      setAgency(agencyData);
      setValidating(false);
      setLoading(false);
    } catch (error) {
      console.error('Error validating token:', error);
      toast.error('Erreur lors de la validation de l\'invitation');
      setValidating(false);
      setLoading(false);
    }
  };

  const acceptInvitation = async () => {
    if (!user || !invitation) return;

    setAccepting(true);
    try {
      const result = await agentInvitationService.acceptInvitation(token, user.id);

      if (result.success) {
        toast.success(result.message || 'Invitation acceptée avec succès !');
        // Redirect to agent dashboard after a short delay
        setTimeout(() => {
          navigate('/agent/dashboard', { replace: true });
        }, 1500);
      } else {
        toast.error(result.message || 'Erreur lors de l\'acceptation de l\'invitation');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error('Erreur lors de l\'acceptation de l\'invitation');
    } finally {
      setAccepting(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthenticating(true);

    try {
      if (isLogin) {
        // Login
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success('Connexion réussie !');
        // Invitation will be auto-accepted in the useEffect
      } else {
        // Register
        const { error } = await signUp(email, password, {
          full_name: fullName,
          user_type: 'agent',
        });
        if (error) throw error;
        toast.success('Compte créé avec succès !');
        // Invitation will be auto-accepted after email verification
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur d\'authentification');
    } finally {
      setAuthenticating(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  // Invalid invitation
  if (!invitation) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center p-4">
        <Card className="bg-white border-[#EFEBE9] max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-[#2C1810] mb-2">
              Invitation invalide
            </h1>
            <p className="text-[#2C1810]/60 mb-6">
              Cette invitation n'est pas valide ou a expiré.
            </p>
            <Button
              onClick={() => navigate('/')}
              className="bg-[#F16522] hover:bg-[#D14E12]"
            >
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User authenticated and accepting invitation
  if (user && accepting) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center p-4">
        <Card className="bg-white border-[#EFEBE9] max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold text-[#2C1810] mb-2">
              Acceptation en cours...
            </h1>
            <p className="text-[#2C1810]/60">
              Nous configurons votre espace agent.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User not authenticated - show auth form
  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          {/* Invitation Details Card */}
          <Card className="bg-white border-[#EFEBE9]">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-[#F16522]/10 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-[#F16522]" />
                </div>
                <div>
                  <p className="text-sm text-[#2C1810]/60">Vous êtes invité à rejoindre</p>
                  <h2 className="text-xl font-bold text-[#2C1810]">{agency?.name}</h2>
                </div>
              </div>

              <div className="space-y-2 text-sm text-[#2C1810]/70">
                <div className="flex justify-between">
                  <span>Rôle:</span>
                  <span className="font-medium text-[#2C1810]">
                    {invitation.role === 'agent' ? 'Agent' : invitation.role}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Commission:</span>
                  <span className="font-medium text-[#2C1810]">{invitation.commission_split}%</span>
                </div>
                {invitation.target_monthly > 0 && (
                  <div className="flex justify-between">
                    <span>Objectif mensuel:</span>
                    <span className="font-medium text-[#2C1810]">
                      {invitation.target_monthly.toLocaleString()} FCFA
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Auth Form Card */}
          <Card className="bg-white border-[#EFEBE9]">
            <CardContent className="p-6">
              <h1 className="text-2xl font-bold text-[#2C1810] mb-6 text-center">
                {isLogin ? 'Connexion' : 'Créer un compte'}
              </h1>

              <form onSubmit={handleAuth} className="space-y-4">
                {!isLogin && (
                  <div>
                    <Label>Nom complet</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2C1810]/40" />
                      <Input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Jean Kouassi"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2C1810]/40" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="votre@email.com"
                      className="pl-10"
                      required
                    />
                  </div>
                  <p className="text-xs text-[#2C1810]/50 mt-1">
                    L'email doit correspondre à l'invitation
                  </p>
                </div>

                <div>
                  <Label>Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2C1810]/40" />
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#F16522] hover:bg-[#D14E12]"
                  disabled={authenticating}
                >
                  {authenticating
                    ? 'Chargement...'
                    : isLogin
                    ? 'Se connecter'
                    : 'Créer mon compte'}
                </Button>
              </form>

              <div className="mt-4 text-center text-sm">
                <span className="text-[#2C1810]/60">
                  {isLogin ? 'Pas encore de compte ?' : 'Déjà un compte ?'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="ml-2 text-[#F16522] font-medium hover:underline"
                >
                  {isLogin ? 'Créer un compte' : 'Se connecter'}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Fallback
  return null;
}
