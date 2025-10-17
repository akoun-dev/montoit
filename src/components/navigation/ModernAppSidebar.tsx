import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { motion } from "framer-motion";
import {
  Home,
  Search,
  Heart,
  MessageSquare,
  User,
  Building2,
  FileText,
  CreditCard,
  Wrench,
  ShieldCheck,
  MapPin,
  PlusCircle,
  LayoutDashboard,
  Shield,
  HelpCircle,
  Settings,
  LogOut,
  Bell,
  Star,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CulturalBadge } from "@/components/ui/cultural-badge";
import monToitLogo from "@/assets/logo/mon-toit-logo.png";
import { cn } from "@/lib/utils";

export function ModernAppSidebar() {
  const { profile, user } = useAuth();
  const { canAccessAdminDashboard } = usePermissions();
  const location = useLocation();
  const { open } = useSidebar();

  const isActive = (path: string) => location.pathname === path;

  // Get user initials
  const getUserInitials = () => {
    if (!profile?.full_name) return "U";
    const names = profile.full_name.split(" ");
    return names.map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Navigation commune
  const commonLinks = [
    { to: "/", icon: Home, label: "Accueil", color: "text-blue-500" },
    { to: "/recherche", icon: Search, label: "Recherche", color: "text-purple-500" },
    { to: "/explorer", icon: MapPin, label: "Explorer", color: "text-green-500" },
  ];

  // Navigation pour utilisateurs connectés
  const userLinks = profile ? [
    { to: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord", color: "text-orange-500", badge: null },
    { to: "/favoris", icon: Heart, label: "Mes Favoris", color: "text-red-500", badge: null },
    { to: "/messages", icon: MessageSquare, label: "Messages", color: "text-blue-500", badge: 3 },
  ] : [];

  // Navigation pour locataires
  const tenantLinks = profile?.user_type === "locataire" ? [
    { to: "/candidatures", icon: FileText, label: "Mes Candidatures", color: "text-indigo-500" },
    { to: "/baux", icon: FileText, label: "Mes Baux", color: "text-teal-500" },
    { to: "/payments", icon: CreditCard, label: "Paiements", color: "text-emerald-500" },
  ] : [];

  // Navigation pour propriétaires et agences
  const ownerLinks = (profile?.user_type === "proprietaire" || profile?.user_type === "agence") ? [
    { to: "/mes-biens", icon: Building2, label: "Mes Biens", color: "text-cyan-500" },
    { to: "/ajouter-bien", icon: PlusCircle, label: "Publier un bien", color: "text-green-500" },
    { to: "/my-mandates", icon: FileText, label: "Mes Mandats", color: "text-amber-500" },
  ] : [];

  // Navigation admin
  const adminLinks = canAccessAdminDashboard ? [
    { to: "/admin", icon: Shield, label: "Admin Dashboard", color: "text-red-500" },
    { to: "/admin/certifications", icon: ShieldCheck, label: "Certifications", color: "text-orange-500" },
  ] : [];

  // Autres liens
  const otherLinks = [
    { to: "/guide", icon: HelpCircle, label: "Aide & Guide", color: "text-gray-500" },
    { to: "/verification", icon: ShieldCheck, label: "Vérification ANSUT", color: "text-primary" },
  ];

  const settingsLinks = profile ? [
    { to: "/profil", icon: Settings, label: "Mon Profil", color: "text-gray-600" },
  ] : [];

  const renderMenuItems = (links: any[], showBadge = false) => {
    return links.map((link) => {
      const active = isActive(link.to);
      return (
        <SidebarMenuItem key={link.to}>
          <SidebarMenuButton asChild isActive={active}>
            <Link to={link.to} className="group relative">
              <motion.div
                className={cn(
                  "flex items-center gap-3 w-full rounded-lg px-3 py-2.5 transition-all duration-200",
                  active 
                    ? "bg-gradient-to-r from-primary/10 to-secondary/10 border-l-3 border-primary" 
                    : "hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent"
                )}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <link.icon className={cn("h-5 w-5", active ? "text-primary" : link.color)} />
                {open && (
                  <>
                    <span className={cn(
                      "flex-1 font-medium text-sm",
                      active ? "text-primary" : "text-foreground"
                    )}>
                      {link.label}
                    </span>
                    {showBadge && link.badge && (
                      <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                        {link.badge}
                      </Badge>
                    )}
                  </>
                )}
              </motion.div>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50 bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header avec logo et badge ANSUT */}
      <SidebarHeader className="border-b border-border/50 px-4 py-4 bg-gradient-to-r from-primary/5 to-secondary/5">
        <Link to="/" className="flex items-center gap-3">
          <motion.img 
            src={monToitLogo} 
            alt="Mon Toit" 
            className="h-10 w-10 rounded-lg shadow-md"
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400 }}
          />
          {open && (
            <div className="flex flex-col">
              <span className="text-base font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Mon Toit
              </span>
              <CulturalBadge variant="kente" className="text-xs px-2 py-0.5">
                Certifié ANSUT
              </CulturalBadge>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {/* User Profile Card */}
        {profile && open && (
          <motion.div 
            className="mx-2 mb-4 p-3 rounded-xl bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/5 border border-primary/20"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-primary/30">
                <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-bold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {profile.full_name || "Utilisateur"}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {profile.user_type || "Membre"}
                </p>
              </div>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </div>
          </motion.div>
        )}

        {/* Navigation Principale */}
        <SidebarGroup>
          {open && (
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
              Navigation
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {renderMenuItems(commonLinks)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Mon Espace */}
        {userLinks.length > 0 && (
          <SidebarGroup className="mt-4">
            {open && (
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                Mon Espace
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {renderMenuItems(userLinks, true)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Section Locataire */}
        {tenantLinks.length > 0 && (
          <SidebarGroup className="mt-4">
            {open && (
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                Locataire
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {renderMenuItems(tenantLinks)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Section Propriétaire */}
        {ownerLinks.length > 0 && (
          <SidebarGroup className="mt-4">
            {open && (
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                Gestion
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {renderMenuItems(ownerLinks)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Section Admin */}
        {adminLinks.length > 0 && (
          <SidebarGroup className="mt-4">
            {open && (
              <SidebarGroupLabel className="text-xs font-semibold text-red-500 uppercase tracking-wider px-3 mb-2">
                Administration
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {renderMenuItems(adminLinks)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Autres */}
        <SidebarGroup className="mt-4">
          {open && (
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
              Autres
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {renderMenuItems(otherLinks)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Paramètres */}
        {settingsLinks.length > 0 && (
          <SidebarGroup className="mt-4">
            <SidebarGroupContent>
              <SidebarMenu>
                {renderMenuItems(settingsLinks)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer moderne */}
      <SidebarFooter className="border-t border-border/50 p-3 bg-gradient-to-r from-muted/30 to-transparent">
        {open ? (
          <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
            <span>© 2025 Mon Toit</span>
            <Star className="h-3 w-3 text-kente-gold fill-kente-gold" />
          </div>
        ) : (
          <div className="flex justify-center">
            <Star className="h-4 w-4 text-kente-gold fill-kente-gold" />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

