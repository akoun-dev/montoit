import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Home, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { TwoFactorVerify } from '@/components/auth/TwoFactorVerify';
import { toast } from '@/hooks/use-toast';
import { getClientIP, getDeviceFingerprint, formatRetryAfter } from '@/lib/ipUtils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { logger } from '@/services/logger';
import { PageTransition } from '@/components/navigation/PageTransition';
import { BrandBar } from '@/components/ui/brand-bar';
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { DynamicBreadcrumb } from "@/components/navigation/DynamicBreadcrumb";
import { QuickNav } from "@/components/navigation/QuickNav";
import { NavigationHelp } from "@/components/navigation/NavigationHelp";
import { LazyIllustration } from "@/components/illustrations/LazyIllustration";
import { getIllustrationPath } from "@/lib/utils";

const signUpSchema = z.object({
  email: z.string().email({ message: "Email invalide" }),
  password: z
    .string()
    .min(8, { message: "Le mot de passe doit contenir au moins 8 caractères" })
    .regex(/[A-Z]/, { message: "Le mot de passe doit contenir au moins une majuscule" })
    .regex(/[a-z]/, { message: "Le mot de passe doit contenir au moins une minuscule" })
    .regex(/[0-9]/, { message: "Le mot de passe doit contenir au moins un chiffre" })
    .regex(/[^A-Za-z0-9]/, { message: "Le mot de passe doit contenir au moins un caractère spécial" }),
  fullName: z.string().min(2, { message: "Le nom complet doit contenir au moins 2 caractères" }),
  userType: z.enum(['locataire', 'proprietaire', 'agence']),
});

const signInSchema = z.object({
  email: z.string().email({ message: "Email invalide" }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères" }),
});

type ValidationErrors = Partial<Record<'email' | 'password' | 'fullName' | 'userType', string>>;

const Auth = () => {
  const { signUp, signIn, user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Lire le type depuis l'URL
  const userTypeFromUrl = searchParams.get('type') as 'locataire' | 'proprietaire' | 'agence' | null;

  // Sign Up form
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [userType, setUserType] = useState<'locataire' | 'proprietaire' | 'agence'>(userTypeFromUrl || 'locataire');
  const [signUpErrors, setSignUpErrors] = useState<ValidationErrors>({});

  // Sign In form
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInErrors, setSignInErrors] = useState<ValidationErrors>({});

  const [loading, setLoading] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  
  // Password visibility toggles
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  // Rate limiting states
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState('');
  const [retryAfter, setRetryAfter] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      // Si l'utilisateur est déjà connecté et essaie d'accéder à /auth avec un type
      // (ex: /auth?type=agence), on le redirige vers son profil pour gérer ses rôles
      if (userTypeFromUrl && userTypeFromUrl !== user.user_metadata?.user_type) {
        toast({
          title: "Déjà connecté",
          description: "Vous êtes déjà connecté. Rendez-vous dans votre profil pour gérer vos rôles.",
        });
        navigate('/profil', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [user, navigate, userTypeFromUrl]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpErrors({});
    
    const validation = signUpSchema.safeParse({
      email: signUpEmail,
      password: signUpPassword,
      fullName,
      userType,
    });

    if (!validation.success) {
      const errors: ValidationErrors = {};
      validation.error.errors.forEach((err) => {
        const field = err.path[0] as keyof ValidationErrors;
        errors[field] = err.message;
      });
      setSignUpErrors(errors);
      return;
    }

    setLoading(true);
    const { error } = await signUp(signUpEmail, signUpPassword, fullName, userType);
    setLoading(false);

    if (!error) {
      navigate('/');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInErrors({});
    setIsBlocked(false);

    const validation = signInSchema.safeParse({
      email: signInEmail,
      password: signInPassword,
    });

    if (!validation.success) {
      const errors: ValidationErrors = {};
      validation.error.errors.forEach((err) => {
        const field = err.path[0] as keyof ValidationErrors;
        errors[field] = err.message;
      });
      setSignInErrors(errors);
      return;
    }

    setLoading(true);

    try {
      // Get IP and fingerprint
      const ipAddress = await getClientIP();
      const fingerprint = getDeviceFingerprint();

      // Check rate limit before attempting sign in
      const { data: rateLimitCheck } = await supabase.rpc('check_login_rate_limit', {
        _email: signInEmail,
        _ip_address: ipAddress
      }) as { data: { allowed: boolean; reason?: string; retry_after?: string; blocked?: boolean; show_captcha?: boolean; failed_count?: number } | null };

      if (rateLimitCheck && typeof rateLimitCheck === 'object' && 'allowed' in rateLimitCheck && !rateLimitCheck.allowed) {
        setIsBlocked(true);
        setBlockMessage(rateLimitCheck.reason || 'Trop de tentatives');
        if (rateLimitCheck.retry_after) {
          setRetryAfter(formatRetryAfter(rateLimitCheck.retry_after));
        }
        setLoading(false);
        return;
      }

      const { error } = await signIn(signInEmail, signInPassword);

      // Log login attempt
      await supabase.from('login_attempts').insert({
        email: signInEmail,
        ip_address: ipAddress,
        user_agent: navigator.userAgent,
        success: !error,
        fingerprint: fingerprint
      });

      setLoading(false);

      if (!error) {
        // Check if user is admin and requires 2FA
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (currentUser) {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', currentUser.id);

          const isAdmin = roles?.some(r => r.role === 'admin');

          if (isAdmin) {
            // Check if 2FA is enabled
            const { data: factors } = await supabase.auth.mfa.listFactors();
            
            if (factors?.totp && factors.totp.length > 0) {
              setPendingUserId(currentUser.id);
              setShow2FA(true);
              return;
            }
          }
        }

        navigate('/');
      }
    } catch (err) {
      logger.logError(err, { context: 'Auth', action: 'signIn', email: signInEmail });
      setLoading(false);
    }
  };

  const handle2FAVerified = () => {
    setShow2FA(false);
    setPendingUserId(null);
    navigate('/');
  };

  const handle2FACancel = async () => {
    await supabase.auth.signOut();
    setShow2FA(false);
    setPendingUserId(null);
  };

  const handleForgotPassword = async () => {
    if (!signInEmail) {
      toast({
        title: "Email requis",
        description: "Veuillez entrer votre email d'abord",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(signInEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Email envoyé",
        description: "Consultez votre boîte mail pour réinitialiser votre mot de passe",
      });
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      
      if (error) {
        logger.logError(error, { context: 'Auth', action: 'googleOAuth', stage: 'initial' });
        throw error;
      }

      if (!data.url) {
        throw new Error('Aucune URL de redirection OAuth reçue');
      }

      // La redirection vers Google se fera automatiquement
      logger.debug('Redirection vers Google OAuth', { url: data.url });
      
    } catch (error: any) {
      logger.logError(error, { context: 'Auth', action: 'googleSignIn', stage: 'complete' });
      
      let errorMessage = 'Impossible de se connecter avec Google';
      
      if (error.message?.includes('OAuth')) {
        errorMessage = 'Le service Google OAuth n\'est pas configuré ou temporairement indisponible. Veuillez utiliser l\'email et le mot de passe pour vous connecter.';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet et réessayez.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erreur de connexion Google",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (show2FA) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background pt-20">
          <div className="container mx-auto px-4 py-8 max-w-md">
            <TwoFactorVerify 
              onVerified={handle2FAVerified}
              onCancel={handle2FACancel}
            />
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <DynamicBreadcrumb />
          
          {/* Hero Illustration */}
          <div className="mb-8">
            <LazyIllustration
              src={getIllustrationPath("ivorian-family-house")}
              alt="Trouvez votre logement en Côte d'Ivoire"
              className="w-full h-[250px] md:h-[300px] rounded-2xl"
              animate={true}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Left Side - Benefits */}
            <div className="space-y-6">
              <NavigationHelp backTo="/" backLabel="Retour à l'accueil" />
              
              <div className="space-y-4">
                <h1 className="text-4xl font-bold text-foreground">
                  Bienvenue sur Mon Toit
                </h1>
                <p className="text-lg text-muted-foreground">
                  La plateforme immobilière certifiée ANSUT pour la Côte d'Ivoire
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">Sécurité garantie</p>
                      <p className="text-sm text-muted-foreground">Tous les utilisateurs sont vérifiés par l'ANSUT</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Home className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">Biens certifiés</p>
                      <p className="text-sm text-muted-foreground">Des logements vérifiés et conformes</p>
                    </div>
                  </li>
                </ul>
              </div>
              
              <QuickNav variant="auth" />
            </div>

            {/* Right Side - Auth Form */}
            <div className="space-y-6">
              <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Connexion</TabsTrigger>
            <TabsTrigger value="signup">Inscription</TabsTrigger>
          </TabsList>

          {/* Sign In Tab */}
          <TabsContent value="signin">
            <Card>
              <CardHeader>
                <CardTitle>Connexion</CardTitle>
                <CardDescription>Connectez-vous à votre compte Mon Toit</CardDescription>
                {userTypeFromUrl && (
                  <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded">
                    💡 <strong>Vous avez déjà un compte ?</strong> Connectez-vous puis gérez vos rôles depuis <Link to="/profil" className="text-primary hover:underline font-medium">votre profil</Link>
                  </p>
                )}
              </CardHeader>
              <form onSubmit={handleSignIn}>
                <CardContent className="space-y-4">
                  {isBlocked && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {blockMessage}
                        {retryAfter && ` Réessayez dans ${retryAfter}.`}
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="votre@email.com"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      required
                    />
                    {signInErrors.email && (
                      <p className="text-sm text-destructive">{signInErrors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Mot de passe</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showSignInPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignInPassword(!showSignInPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showSignInPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      >
                        {showSignInPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {signInErrors.password && (
                      <p className="text-sm text-destructive">{signInErrors.password}</p>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-sm text-primary hover:underline"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                </CardContent>
                <CardFooter className="flex-col gap-3">
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Connexion...' : 'Se connecter'}
                  </Button>
                  
                  <div className="relative w-full">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Ou continuer avec
                      </span>
                    </div>
                  </div>

                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleGoogleSignIn}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continuer avec Google
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          {/* Sign Up Tab */}
          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Inscription</CardTitle>
                <CardDescription>
                  {userTypeFromUrl === 'agence' && 'Créez votre compte Agence immobilière'}
                  {userTypeFromUrl === 'proprietaire' && 'Créez votre compte Propriétaire'}
                  {userTypeFromUrl === 'locataire' && 'Créez votre compte Locataire'}
                  {!userTypeFromUrl && 'Créez votre compte Mon Toit'}
                </CardDescription>
                {userTypeFromUrl && (
                  <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded">
                    💡 <strong>Vous voulez ajouter ce rôle à un compte existant ?</strong> Connectez-vous puis <Link to="/profil" className="text-primary hover:underline font-medium">gérez vos rôles depuis votre profil</Link>
                  </p>
                )}
              </CardHeader>
              <form onSubmit={handleSignUp}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullname">Nom complet</Label>
                    <Input
                      id="fullname"
                      type="text"
                      placeholder="Jean Kouamé"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                    {signUpErrors.fullName && (
                      <p className="text-sm text-destructive">{signUpErrors.fullName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="votre@email.com"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      required
                    />
                    {signUpErrors.email && (
                      <p className="text-sm text-destructive">{signUpErrors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Mot de passe</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showSignUpPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showSignUpPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      >
                        {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {signUpErrors.password && (
                      <p className="text-sm text-destructive">{signUpErrors.password}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="usertype">Type de compte</Label>
                    <Select value={userType} onValueChange={(value: 'locataire' | 'proprietaire' | 'agence') => setUserType(value)}>
                      <SelectTrigger id="usertype">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="locataire">🏠 Locataire - Je cherche un logement</SelectItem>
                        <SelectItem value="proprietaire">🏢 Propriétaire - Je loue mes biens</SelectItem>
                        <SelectItem value="agence">🏪 Agence - Je gère un portfolio</SelectItem>
                      </SelectContent>
                    </Select>
                    {signUpErrors.userType && (
                      <p className="text-sm text-destructive">{signUpErrors.userType}</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex-col gap-2">
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Création...' : 'Créer mon compte'}
                  </Button>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    <span>Plateforme certifiée ANSUT</span>
                  </div>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          En créant un compte, vous acceptez nos{' '}
          <Link to="/conditions" className="text-primary hover:underline">
            conditions d'utilisation
          </Link>
        </p>
              </div>
            </div>
          </div>
        </div>
      <Footer />
    </>
  );
};

export default Auth;
