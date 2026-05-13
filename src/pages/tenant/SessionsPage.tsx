/**
 * Page de gestion des sessions pour les locataires
 *
 * Permet de voir et gérer les sessions actives:
 * - Liste des appareils connectés
 * - Révocation de session individuelle
 * - Révocation de toutes les sessions
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe,
  ChevronRight,
  Loader2,
  AlertTriangle,
  LogOut,
  Monitor,
  Smartphone as PhoneIcon,
  Tablet,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

interface Session {
  id: string;
  device_type: 'mobile' | 'tablet' | 'desktop';
  device_name?: string;
  browser: string;
  os: string;
  location?: string;
  ip_address?: string;
  last_active: string;
  created_at: string;
  is_current: boolean;
}

export default function TenantSessionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [revokingAll, setRevokingAll] = useState(false);

  // Charger les sessions
  useEffect(() => {
    loadSessions();
  }, [user?.id]);

  const loadSessions = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Récupérer les sessions depuis Supabase Auth
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) throw error;

      // Pour l'instant, Supabase ne fournit pas directement la liste des sessions
      // Nous allons créer une session basée sur la session actuelle
      const currentSession: Session = {
        id: session?.access_token || 'current',
        device_type: getDeviceType(),
        device_name: getDeviceName(),
        browser: getBrowser(),
        os: getOS(),
        last_active: new Date().toISOString(),
        created_at: session?.user?.created_at || new Date().toISOString(),
        is_current: true,
      };

      setSessions([currentSession]);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('Erreur lors du chargement des sessions');
    } finally {
      setLoading(false);
    }
  };

  // Détecter le type d'appareil
  const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
    const ua = navigator.userAgent;
    if (/tablet|ipad/i.test(ua)) return 'tablet';
    if (/mobile|iphone|android/i.test(ua)) return 'mobile';
    return 'desktop';
  };

  // Obtenir le nom de l'appareil
  const getDeviceName = (): string => {
    const ua = navigator.userAgent;
    if (/iPhone/i.test(ua)) return 'iPhone';
    if (/iPad/i.test(ua)) return 'iPad';
    if (/Android/i.test(ua)) return 'Android';
    if (/Macintosh/i.test(ua)) return 'Mac';
    if (/Windows/i.test(ua)) return 'Windows PC';
    if (/Linux/i.test(ua)) return 'Linux';
    return 'Appareil';
  };

  // Obtenir le navigateur
  const getBrowser = (): string => {
    const ua = navigator.userAgent;
    if (/Chrome/i.test(ua) && !/Edge|OPR/i.test(ua)) return 'Chrome';
    if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
    if (/Firefox/i.test(ua)) return 'Firefox';
    if (/Edge/i.test(ua)) return 'Edge';
    if (/OPR/i.test(ua)) return 'Opera';
    return 'Navigateur';
  };

  // Obtenir l'OS
  const getOS = (): string => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
    if (/Android/i.test(ua)) return 'Android';
    if (/Windows/i.test(ua)) return 'Windows';
    if (/Macintosh|Mac OS/i.test(ua)) return 'macOS';
    if (/Linux/i.test(ua)) return 'Linux';
    return 'OS';
  };

  // Formater la date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return date.toLocaleDateString('fr-FR');
  };

  // Révoquer une session
  const handleRevokeSession = async (sessionId: string) => {
    setRevoking(sessionId);
    try {
      // Supabase Auth ne permet pas de révoquer une session spécifique directement
      // On signout l'utilisateur
      await supabase.auth.signOut();
      toast.success('Session révoquée');
      navigate('/connexion');
    } catch (error) {
      console.error('Error revoking session:', error);
      toast.error('Erreur lors de la révocation de la session');
    } finally {
      setRevoking(null);
    }
  };

  // Révoquer toutes les autres sessions
  const handleRevokeAllSessions = async () => {
    setRevokingAll(true);
    try {
      // Supabase Auth ne fournit pas cette fonctionnalité directement
      // On peut seulement se déconnecter
      toast.info('Pour révoquer toutes les sessions, utilisez "Se déconnecter"');
    } catch (error) {
      console.error('Error revoking all sessions:', error);
      toast.error('Erreur lors de la révocation');
    } finally {
      setRevokingAll(false);
    }
  };

  // Obtenir l'icône du type d'appareil
  const getDeviceIcon = (type: 'mobile' | 'tablet' | 'desktop') => {
    switch (type) {
      case 'mobile':
        return PhoneIcon;
      case 'tablet':
        return Tablet;
      case 'desktop':
        return Monitor;
      default:
        return Monitor;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[75vh] bg-[#FAF7F4] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F16522] mx-auto mb-4" />
          <p className="text-[#6B5A4E]">Chargement des sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] bg-[#FAF7F4] px-2 sm:px-4 pb-4 pt-6 lg:pt-2">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-[#EFEBE9]"
          >
            <ChevronRight className="w-5 h-5 text-[#8B7466] rotate-180" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#6B5A4E]">Sessions actives</h1>
            <p className="text-[#8B7466] mt-1">Appareils connectés à votre compte</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {/* Info */}
        <div className="bg-[#F16522]/10 border border-[#F16522]/20 rounded-[24px] p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#F16522] mt-0.5 flex-shrink-0" />
            <div className="text-sm text-[#6B5A4E]">
              <p className="font-medium mb-1">Gestion des sessions</p>
              <p className="text-[#8B7466]">
                Vous pouvez voir tous les appareils connectés à votre compte. Pour des raisons de sécurité,
                il est recommandé de révoquer les sessions que vous ne reconnaissez pas.
              </p>
            </div>
          </div>
        </div>

        {/* Liste des sessions */}
        <div className="bg-white rounded-[24px] border border-[#EFEBE9] shadow-sm overflow-hidden">
          <div className="bg-[#F16522]/10 px-6 py-4 border-b border-[#EFEBE9]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <Globe className="w-5 h-5 text-[#F16522]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#6B5A4E]">Appareils connectés</h2>
                  <p className="text-sm text-[#8B7466] mt-0.5">
                    {sessions.length} session{sessions.length > 1 ? 's' : ''} active{sessions.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              {sessions.length > 1 && (
                <button
                  onClick={handleRevokeAllSessions}
                  disabled={revokingAll}
                  className="px-3 py-1.5 text-sm font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                >
                  {revokingAll ? 'Révocation...' : 'Révoquer tout'}
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            {sessions.length === 0 ? (
              <div className="text-center py-8">
                <Globe className="w-12 h-12 text-[#8B7466] mx-auto mb-4 opacity-50" />
                <p className="text-[#8B7466]">Aucune session active</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => {
                  const DeviceIcon = getDeviceIcon(session.device_type);

                  return (
                    <div
                      key={session.id}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 ${
                        session.is_current ? 'border-green-500 bg-green-50' : 'border-[#EFEBE9]'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${session.is_current ? 'bg-green-100' : 'bg-[#FAF7F4]'}`}>
                          <DeviceIcon className={`w-5 h-5 ${session.is_current ? 'text-green-600' : 'text-[#8B7466]'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-[#6B5A4E]">{session.device_name || 'Appareil'}</p>
                            {session.is_current && (
                              <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-medium rounded-full">
                                Actuelle
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[#8B7466] mt-0.5">
                            {session.browser} sur {session.os}
                          </p>
                          <p className="text-xs text-[#8B7466] mt-0.5">
                            Connecté {formatDate(session.created_at)} • Activité {formatDate(session.last_active)}
                          </p>
                        </div>
                      </div>
                      {!session.is_current && (
                        <button
                          onClick={() => handleRevokeSession(session.id)}
                          disabled={revoking === session.id}
                          className="px-3 py-1.5 text-sm font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                        >
                          {revoking === session.id ? 'Révocation...' : 'Révoquer'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Déconnexion */}
        <button
          onClick={() => {
            supabase.auth.signOut();
            navigate('/connexion');
          }}
          className="w-full bg-white rounded-[24px] border border-[#EFEBE9] shadow-sm p-5 hover:bg-red-50 hover:border-red-200 transition-all group"
        >
          <div className="flex items-center justify-center gap-3">
            <div className="p-2 bg-red-100 rounded-xl group-hover:bg-red-200 transition-colors">
              <LogOut className="w-6 h-6 text-red-600" />
            </div>
            <span className="text-lg font-semibold text-red-600">
              Se déconnecter
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
