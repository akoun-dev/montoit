import {
  Home,
  Search,
  PlusCircle,
  User,
  Heart,
  Calendar,
  Bell,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  MessageCircle,
  Building2,
  Key,
  LayoutDashboard,
  Shield,
  BadgeCheck,
  Eye,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useState, useEffect, type ComponentType } from 'react';
import { useBreakpoint } from '@/hooks/shared/useBreakpoint';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useUnreadCount } from '@/hooks/messaging/useUnreadCount';
import { useContextualRoles } from '@/hooks/shared/useContextualRoles';
import { usePermissions } from '@/hooks/shared/usePermissions';

export default function HeaderPremium() {
  const { user, profile, signOut } = useAuth();
  const { isMobile } = useBreakpoint();
  const location = useLocation();
  const navigate = useNavigate();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { count: unreadCount } = useUnreadCount();
  const { propertiesCount, activeLeasesAsTenantCount } = useContextualRoles();
  const permissions = usePermissions();

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  // Déterminer le contexte actuel basé sur l'URL
  const isInOwnerContext = location.pathname.startsWith('/proprietaire');
  const isInTenantContext = location.pathname.startsWith('/locataire');
  const isInAdminContext = location.pathname.startsWith('/admin');
  const isInTrustAgentContext = location.pathname.startsWith('/trust-agent');

  // Générer le label de rôle contextuel
  const getRoleLabel = () => {
    if (permissions.isTrustAgent) return '🛡️ Agent de confiance';
    if (permissions.isOwner && permissions.isTenant) return '🏠 Propriétaire & 🔑 Locataire';
    if (permissions.isOwner) return '🏠 Propriétaire';
    if (permissions.isTenant) return '🔑 Locataire';
    if (permissions.isAgent) return '🏢 Agent';
    return '👋 Nouveau membre';
  };

  // Badge rôle système (Admin, Trust Agent, Moderator)
  const getSystemRoleBadge = () => {
    if (permissions.isAdmin)
      return { label: 'Admin', icon: Shield, color: 'bg-purple-100 text-purple-700' };
    if (permissions.isTrustAgent)
      return {
        label: 'Agent Certifié',
        icon: BadgeCheck,
        color: 'bg-emerald-100 text-emerald-700',
      };
    if (permissions.isModerator)
      return { label: 'Modérateur', icon: Eye, color: 'bg-blue-100 text-blue-700' };
    return null;
  };

  const systemRoleBadge = getSystemRoleBadge();
  const contextLinks: Array<{
    label: string;
    href: string;
    icon: ComponentType<{ className?: string }>;
    badge?: number;
    isActive: boolean;
    accent: string;
  }> = [];
  if (permissions.isTenant) {
    contextLinks.push({
      label: 'Espace locataire',
      href: '/locataire/dashboard',
      icon: Key,
      badge: activeLeasesAsTenantCount,
      isActive: isInTenantContext,
      accent: 'tenant',
    });
  }
  if (permissions.isOwner) {
    contextLinks.push({
      label: 'Espace propriétaire',
      href: '/proprietaire/dashboard',
      icon: Building2,
      badge: propertiesCount,
      isActive: isInOwnerContext,
      accent: 'owner',
    });
  }
  if (permissions.isAgent) {
    contextLinks.push({
      label: 'Espace agence',
      href: '/agences/dashboard',
      icon: Building2,
      badge: undefined,
      isActive: location.pathname.startsWith('/agences'),
      accent: 'agent',
    });
  }
  if (permissions.isTrustAgent) {
    contextLinks.push({
      label: 'Espace trust agent',
      href: '/trust-agent/dashboard',
      icon: Shield,
      badge: undefined,
      isActive: location.pathname.startsWith('/trust-agent'),
      accent: 'trust',
    });
  }

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Navigation principale filtrée par permissions
  const mainNavItems = [
    { label: 'Rechercher', href: '/recherche', icon: Search, visible: true },
    {
      label: 'Louer mon bien',
      href: '/ajouter-propriete',
      icon: PlusCircle,
      visible: permissions.canAddProperty || !permissions.isAuthenticated,
    },
  ].filter((item) => item.visible);

  // Menu utilisateur filtré par permissions et rôle (tenant/owner/agent)
  const buildUserMenuItems = () => {
    if (!user) return [];
    const items: {
      label: string;
      href: string;
      icon: ComponentType<{ className?: string }>;
      badge?: number;
    }[] = [];
    const addItem = (
      label: string,
      href: string,
      icon: React.ComponentType<{ className?: string }>,
      badge?: number
    ) => {
      // éviter les doublons par href
      if (items.some((i) => i.href === href)) return;
      items.push({ label, href, icon, badge });
    };

    // Contexte prioritaire basé sur l'URL, sinon rôles disponibles
    const primaryContext = isInOwnerContext
      ? 'owner'
      : isInTrustAgentContext
        ? 'trust'
        : isInTenantContext
          ? 'tenant'
          : permissions.isTrustAgent
            ? 'trust'
            : permissions.isOwner
              ? 'owner'
              : permissions.isAgent
                ? 'agent'
                : permissions.isTenant
                  ? 'tenant'
                  : 'guest';

    // Locataire
    if (permissions.isTenant) {
      addItem('Vue locataire', '/locataire/dashboard', LayoutDashboard);
      addItem('Mes locations', '/locataire/dashboard', Key);
      addItem('Mes favoris', '/locataire/favoris', Heart);
      addItem('Mes visites', '/locataire/mes-visites', Calendar);
      addItem('Mes contrats', '/locataire/mes-contrats', FileText);
      addItem('Messages', '/locataire/messages', MessageCircle, unreadCount);
      addItem('Profil locataire', '/locataire/profil', User);
    }

    // Propriétaire
    if (permissions.isOwner) {
      addItem('Espace propriétaire', '/proprietaire/dashboard', Building2);
      addItem('Mes biens', '/proprietaire/mes-biens', Building2);
      addItem('Candidatures', '/proprietaire/candidatures', LayoutDashboard);
      addItem('Contrats', '/proprietaire/contrats', FileText);
      addItem('Messages', '/proprietaire/messages', MessageCircle, unreadCount);
      addItem('Profil propriétaire', '/proprietaire/profil', User);
    }

    // Agence
    if (permissions.isAgent) {
      addItem('Espace agence', '/agences/dashboard', Building2);
      addItem('Mandats', '/agences/mandats', LayoutDashboard);
      addItem('Candidatures', '/agences/candidatures', LayoutDashboard);
      addItem('Contrats', '/agences/contrats', FileText);
      addItem('Messages', '/agences/messages', MessageCircle, unreadCount);
      addItem('Profil agence', '/agences/profil', Settings);
    }

    // Trust agent
    if (permissions.isTrustAgent) {
      addItem('Espace trust agent', '/trust-agent/dashboard', Shield);
      addItem('Missions', '/trust-agent/missions', LayoutDashboard);
      addItem('Certifications', '/trust-agent/certifications/users', BadgeCheck);
      addItem('Historique', '/trust-agent/history', Clock);
    }

    // Profil/settings par défaut selon le contexte principal
    const profilePaths: Record<string, string> = {
      owner: '/proprietaire/profil',
      agent: '/agences/profil',
      tenant: '/locataire/profil',
      trust: '/trust-agent/dashboard',
      guest: '/profil',
    };
    addItem('Paramètres', profilePaths[primaryContext] || '/profil', Settings);

    return items;
  };

  const userMenuItems = buildUserMenuItems();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out motion-reduce:transition-none ${
          scrolled
            ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-[#EFEBE9]'
            : 'bg-white border-b border-[#EFEBE9]'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-[72px]">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src="/logo.png"
                alt="Mon Toit"
                className="h-10 w-10 object-contain transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-3"
              />
              <div className="flex flex-col">
                <span className="text-xl font-extrabold text-[#2C1810] leading-none tracking-tight group-hover:text-[#F16522] transition-colors">
                  MON TOIT
                </span>
                {!isMobile && (
                  <span className="text-[10px] font-bold text-[#A69B95] uppercase tracking-wider">
                    Immobilier Certifié
                  </span>
                )}
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <Link
                to="/"
                className={`relative py-2 text-sm font-bold transition-colors group ${
                  isActive('/') ? 'text-[#F16522]' : 'text-[#6B5A4E] hover:text-[#2C1810]'
                }`}
              >
                Accueil
                <span
                  className={`absolute bottom-0 left-0 w-full h-[3px] bg-[#F16522] rounded-full transform origin-left transition-transform duration-300 ease-out ${
                    isActive('/') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                  }`}
                />
              </Link>

              {mainNavItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  className={`relative py-2 text-sm font-bold transition-colors group ${
                    isActive(item.href) ? 'text-[#F16522]' : 'text-[#6B5A4E] hover:text-[#2C1810]'
                  }`}
                >
                  <span className="flex items-center gap-1">{item.label}</span>
                  <span
                    className={`absolute bottom-0 left-0 w-full h-[3px] bg-[#F16522] rounded-full transform origin-left transition-transform duration-300 ease-out ${
                      isActive(item.href) ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                    }`}
                  />
                </Link>
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-4">
              {/* Message Badge - WhatsApp Style */}
              {user && permissions.canSendMessages && (
                <Link
                  to="/locataire/messages"
                  className={`relative p-2.5 rounded-full transition-all duration-200 hover:bg-[#F5E6D3]/50 ${
                    isActive('/locataire/messages') ? 'bg-[#F5E6D3]/50' : ''
                  }`}
                  aria-label={`Messages${unreadCount > 0 ? `, ${unreadCount} non lus` : ''}`}
                >
                  <MessageCircle
                    className={`h-5 w-5 ${isActive('/locataire/messages') ? 'text-[#F16522]' : 'text-[#6B5A4E]'}`}
                  />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-[#25D366] text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md whatsapp-badge-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              )}

              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    onBlur={() => setTimeout(() => setShowUserMenu(false), 200)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#F16522] text-white font-bold hover:bg-[#D95318] shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                  >
                    <User className="h-4 w-4" />
                    <span>Mon Compte</span>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-[0_20px_40px_rgba(44,24,16,0.1)] border border-[#EFEBE9] py-2 z-50 animate-fade-in">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-[#EFEBE9]">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-[#2C1810] truncate">
                            {profile?.full_name || 'Utilisateur'}
                          </p>
                          {systemRoleBadge && (
                            <span
                              className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${systemRoleBadge.color}`}
                            >
                              <systemRoleBadge.icon className="h-3 w-3" />
                              {systemRoleBadge.label}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#A69B95] truncate">{user.email}</p>
                        <p className="text-xs text-[#F16522] font-medium mt-1">{getRoleLabel()}</p>
                      </div>

                      {/* Admin & Trust Agent Links */}
                      {(permissions.canAccessAdmin || permissions.canCertifyUser) && (
                        <div className="px-2 py-2 border-b border-[#EFEBE9]">
                          <p className="px-2 py-1 text-xs font-bold text-[#A69B95] uppercase tracking-wider">
                            Administration
                          </p>

                          {permissions.canAccessAdmin && (
                            <Link
                              to="/admin"
                              className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                                isInAdminContext
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'text-[#6B5A4E] hover:bg-[#FAF7F4] hover:text-purple-700'
                              }`}
                            >
                              <Shield className="h-4 w-4" />
                              <span>Tableau Admin</span>
                            </Link>
                          )}

                          {permissions.canCertifyUser && (
                            <Link
                              to="/trust-agent/dashboard"
                              className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                                isInTrustAgentContext
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'text-[#6B5A4E] hover:bg-[#FAF7F4] hover:text-emerald-700'
                              }`}
                            >
                              <BadgeCheck className="h-4 w-4" />
                              <span>Certifications</span>
                            </Link>
                          )}
                        </div>
                      )}

                      {/* Mon Espace - Contextual Dashboard Links */}
                      <div className="px-2 py-2 border-b border-[#EFEBE9]">
                        <p className="px-2 py-1 text-xs font-bold text-[#A69B95] uppercase tracking-wider">
                          Mon Espace
                        </p>
                        {contextLinks.length === 0 && (
                          <div className="px-3 py-2 text-xs text-[#A69B95]">
                            Commencez à chercher un logement ou publiez une annonce pour voir vos
                            espaces ici.
                          </div>
                        )}
                        {contextLinks.map((link) => {
                          const Icon = link.icon;
                          return (
                            <Link
                              key={link.href}
                              to={link.href}
                              className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                                link.isActive
                                  ? 'bg-[#F16522]/10 text-[#F16522]'
                                  : 'text-[#6B5A4E] hover:bg-[#FAF7F4] hover:text-[#F16522]'
                              }`}
                            >
                              <span className="flex items-center gap-3">
                                <Icon className="h-4 w-4" />
                                {link.label}
                              </span>
                              {link.badge !== undefined && (
                                <span
                                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                    link.accent === 'tenant'
                                      ? 'bg-[#25D366]/10 text-[#25D366]'
                                      : 'bg-[#F16522]/10 text-[#F16522]'
                                  }`}
                                >
                                  {link.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>

                      {/* Other Menu Items */}
                      {userMenuItems.map((item) => (
                        <Link
                          key={item.label}
                          to={item.href}
                          className="flex items-center justify-between px-4 py-2.5 text-sm text-[#6B5A4E] hover:bg-[#FAF7F4] hover:text-[#F16522] transition-colors duration-150"
                        >
                          <div className="flex items-center gap-3">
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </div>
                          {item.badge && item.badge > 0 && (
                            <span className="bg-[#25D366] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                              {item.badge > 9 ? '9+' : item.badge}
                            </span>
                          )}
                        </Link>
                      ))}

                      <div className="border-t border-[#EFEBE9] mt-2 pt-2">
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150 w-full"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Déconnexion</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link
                    to="/connexion"
                    className="px-5 py-2.5 rounded-full border border-[#EFEBE9] text-[#6B5A4E] font-bold hover:border-[#F16522] hover:text-[#F16522] hover:-translate-y-0.5 transition-all duration-200"
                  >
                    Connexion
                  </Link>
                  <Link
                    to="/inscription"
                    className="px-6 py-2.5 rounded-full bg-[#F16522] text-white font-bold hover:bg-[#D95318] shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                  >
                    Inscription
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 rounded-lg text-[#2C1810] hover:bg-[#FAF7F4] transition-colors duration-200"
            >
              {showMobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Spacer */}
      <div className="h-[72px]" />

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 bg-[#2C1810]/20 z-40 md:hidden"
          onClick={() => setShowMobileMenu(false)}
        />
      )}

      {/* Mobile Menu Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white z-50 transform transition-transform duration-300 ease-out md:hidden shadow-[0_0_60px_rgba(44,24,16,0.15)] ${
          showMobileMenu ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 space-y-6 overflow-y-auto h-full">
          <div className="flex justify-end">
            <button
              onClick={() => setShowMobileMenu(false)}
              className="p-2 rounded-lg text-[#A69B95] hover:bg-[#FAF7F4] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {user && (
            <div className="pb-4 border-b border-[#EFEBE9]">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-[#2C1810] truncate">
                  {profile?.full_name || 'Utilisateur'}
                </p>
                {systemRoleBadge && (
                  <span
                    className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${systemRoleBadge.color}`}
                  >
                    <systemRoleBadge.icon className="h-3 w-3" />
                    {systemRoleBadge.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#A69B95] truncate">{user.email}</p>
              <p className="text-xs text-[#F16522] font-medium mt-1">{getRoleLabel()}</p>
            </div>
          )}

          {/* Admin & Trust Agent Links - Mobile */}
          {user && (permissions.canAccessAdmin || permissions.canCertifyUser) && (
            <div className="pb-4 border-b border-[#EFEBE9]">
              <p className="px-4 py-2 text-xs font-bold text-[#A69B95] uppercase tracking-wider">
                Administration
              </p>

              {permissions.canAccessAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setShowMobileMenu(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-r-lg transition-colors ${
                    isInAdminContext
                      ? 'bg-purple-100 text-purple-700 border-l-4 border-purple-500'
                      : 'text-[#6B5A4E] hover:bg-[#FAF7F4] hover:text-purple-700'
                  }`}
                >
                  <Shield className="h-5 w-5" />
                  <span className="font-medium">Tableau Admin</span>
                </Link>
              )}

              {permissions.canCertifyUser && (
                <Link
                  to="/trust-agent/dashboard"
                  onClick={() => setShowMobileMenu(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-r-lg transition-colors ${
                    isInTrustAgentContext
                      ? 'bg-emerald-100 text-emerald-700 border-l-4 border-emerald-500'
                      : 'text-[#6B5A4E] hover:bg-[#FAF7F4] hover:text-emerald-700'
                  }`}
                >
                  <BadgeCheck className="h-5 w-5" />
                  <span className="font-medium">Certifications</span>
                </Link>
              )}
            </div>
          )}

          {/* Mon Espace - Mobile Contextual Section */}
          {user && (
            <div className="pb-4 border-b border-[#EFEBE9]">
              <p className="px-4 py-2 text-xs font-bold text-[#A69B95] uppercase tracking-wider">
                Mon Espace
              </p>
              {contextLinks.length === 0 && (
                <div className="px-4 py-2 text-xs text-[#A69B95]">
                  Commencez à chercher un logement ou publiez une annonce pour voir vos espaces ici.
                </div>
              )}
              {contextLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setShowMobileMenu(false)}
                    className={`flex items-center justify-between px-4 py-3 rounded-r-lg transition-colors ${
                      link.isActive
                        ? 'bg-[#F16522]/10 text-[#F16522] border-l-4 border-[#F16522]'
                        : 'text-[#6B5A4E] hover:bg-[#FAF7F4] hover:text-[#F16522]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{link.label}</span>
                    </div>
                    {link.badge !== undefined && (
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          link.accent === 'tenant'
                            ? 'bg-[#25D366]/10 text-[#25D366]'
                            : 'bg-[#F16522]/10 text-[#F16522]'
                        }`}
                      >
                        {link.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          <nav className="space-y-1">
            <Link
              to="/"
              onClick={() => setShowMobileMenu(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-r-lg transition-colors ${
                isActive('/')
                  ? 'bg-[#F16522]/10 text-[#F16522] border-l-4 border-[#F16522]'
                  : 'text-[#6B5A4E] hover:bg-[#FAF7F4] hover:text-[#F16522]'
              }`}
            >
              <Home className="h-5 w-5" />
              <span className="font-medium">Accueil</span>
            </Link>

            {mainNavItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                onClick={() => setShowMobileMenu(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-r-lg transition-colors ${
                  isActive(item.href)
                    ? 'bg-[#F16522]/10 text-[#F16522] border-l-4 border-[#F16522]'
                    : 'text-[#6B5A4E] hover:bg-[#FAF7F4] hover:text-[#F16522]'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}

            {user &&
              userMenuItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  onClick={() => setShowMobileMenu(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-r-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-[#F16522]/10 text-[#F16522] border-l-4 border-[#F16522]'
                      : 'text-[#6B5A4E] hover:bg-[#FAF7F4] hover:text-[#F16522]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {item.badge && item.badge > 0 && (
                    <span className="bg-[#25D366] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </Link>
              ))}
          </nav>

          <div className="pt-4 border-t border-[#EFEBE9] space-y-3">
            {user ? (
              <button
                onClick={() => {
                  handleSignOut();
                  setShowMobileMenu(false);
                }}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-red-600 border border-red-200 hover:bg-red-50 transition-colors font-medium"
              >
                <LogOut className="h-5 w-5" />
                <span>Déconnexion</span>
              </button>
            ) : (
              <>
                <Link
                  to="/connexion"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center justify-center w-full px-4 py-3 rounded-xl text-[#6B5A4E] border border-[#EFEBE9] hover:border-[#F16522] hover:text-[#F16522] transition-colors font-medium"
                >
                  Connexion
                </Link>
                <Link
                  to="/inscription"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center justify-center w-full px-4 py-3 rounded-xl bg-[#F16522] text-white hover:bg-[#D95318] transition-colors font-medium shadow-lg shadow-orange-500/20"
                >
                  Inscription
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
