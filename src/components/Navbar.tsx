import { Button } from "@/components/ui/button";
import { User, LogOut, LayoutDashboard, ShieldCheck, Shield, Search, PlusCircle, HelpCircle, FileText } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import monToitLogo from "@/assets/logo/mon-toit-logo.png";
import NotificationBell from "@/components/NotificationBell";
import CertificationNotificationBadge from "@/components/admin/CertificationNotificationBadge";
import { VerificationProgress } from "@/components/navigation/VerificationProgress";
import { MobileMenu } from "@/components/navigation/MobileMenu";
import { RoleSwitcherCompact } from "@/components/navigation/RoleSwitcherCompact";
import { useIsMobile } from "@/hooks/use-mobile";
import { RoleBadge } from "@/components/navigation/RoleBadge";

const Navbar = () => {
  const { user, profile, signOut } = useAuth();
  const { canAccessAdminDashboard } = usePermissions();
  const isMobile = useIsMobile();

  return (<>
    <nav
      aria-label="Navigation principale"
      className={`fixed top-0 left-0 right-0 z-50 bg-background/98 backdrop-blur-md border-b border-border shadow-sm ${isMobile && user ? 'mb-16' : ''}`}
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <picture>
              <img
                src={monToitLogo}
                alt="Mon Toit - Plateforme Immobilière Certifiée ANSUT"
                className="h-10 sm:h-12 w-auto object-contain shrink-0 group-hover:scale-105 transition-smooth"
                loading="eager"
                fetchpriority="high"
                decoding="async"
                width="64"
                height="64"
              />
            </picture>
            <div className="hidden sm:flex flex-col">
              <span className="text-2xl font-bold text-primary leading-tight">
                Mon Toit
              </span>
              <span className="text-xs text-secondary leading-tight flex items-center gap-1 font-semibold">
                <ShieldCheck className="h-3.5 w-3.5" />
                Certifié ANSUT
              </span>
            </div>
          </Link>

          {/* Navigation Links - Simplified to 3 core items */}
          <div className="hidden md:flex items-center gap-6">
            <Link 
              to="/explorer" 
              className="text-sm font-medium text-foreground/80 hover:text-primary hover:underline decoration-2 underline-offset-4 transition-all duration-150"
            >
              Explorer
            </Link>
            <Link 
              to="/publier" 
              className="text-sm font-medium text-foreground/80 hover:text-primary hover:underline decoration-2 underline-offset-4 transition-all duration-150"
            >
              Publier
            </Link>
            <Link 
              to="/guide" 
              className="text-sm font-medium text-foreground/80 hover:text-primary hover:underline decoration-2 underline-offset-4 transition-all duration-150"
            >
              Aide
            </Link>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <RoleBadge />
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Avatar>
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 bg-background border border-border shadow-lg">
                    <DropdownMenuLabel className="pb-2">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-semibold text-foreground">{profile?.full_name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        {(profile?.oneci_verified || profile?.cnam_verified) && (
                          <Badge variant="outline" className="w-fit mt-1 text-xs border-primary text-primary">
                            ✓ Certifié ANSUT
                          </Badge>
                        )}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuGroup>
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard" className="cursor-pointer flex items-center">
                          <LayoutDashboard className="mr-3 h-4 w-4 text-primary" />
                          <span>Tableau de bord</span>
                        </Link>
                      </DropdownMenuItem>
                      {profile?.user_type === 'locataire' && (
                        <DropdownMenuItem asChild>
                          <Link to="/dashboard/tenant" className="cursor-pointer flex items-center">
                            <LayoutDashboard className="mr-3 h-4 w-4 text-primary" />
                            <span>Dashboard Locataire</span>
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {profile?.user_type === 'agence' && (
                        <DropdownMenuItem asChild>
                          <Link to="/dashboard/agence" className="cursor-pointer flex items-center">
                            <LayoutDashboard className="mr-3 h-4 w-4 text-primary" />
                            <span>Dashboard Agence</span>
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {(profile?.user_type === 'proprietaire' || profile?.user_type === 'agence') && (
                        <DropdownMenuItem asChild>
                          <Link to="/my-mandates" className="cursor-pointer flex items-center">
                            <FileText className="mr-3 h-4 w-4 text-primary" />
                            <span>Mes Mandats</span>
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link to="/profil" className="cursor-pointer flex items-center">
                          <User className="mr-3 h-4 w-4 text-primary" />
                          <span>Mon profil</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/verification" className="cursor-pointer flex items-center">
                          <ShieldCheck className="mr-3 h-4 w-4 text-primary" />
                          <span>Vérification</span>
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>

                    {canAccessAdminDashboard && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                          <DropdownMenuItem asChild>
                            <Link to="/admin" className="cursor-pointer flex items-center">
                              <Shield className="mr-3 h-4 w-4 text-primary" />
                              <span>Admin Dashboard</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to="/admin/certifications" className="cursor-pointer flex items-center">
                              <Shield className="mr-3 h-4 w-4 text-primary" />
                              <span>Certifications ANSUT</span>
                              <CertificationNotificationBadge />
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
                      <LogOut className="mr-3 h-4 w-4" />
                      <span>Déconnexion</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button 
                size="sm" 
                variant="default"
                className="font-semibold" 
                asChild
              >
                <Link to="/auth">
                  <User className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Connexion</span>
                </Link>
              </Button>
            )}
            
            {/* Mobile Menu */}
            <MobileMenu />
          </div>
        </div>
      </div>
    </nav>
    {/* Barre de couleurs identité */}
    <div className="fixed top-14 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary z-40" />
  </>);
};

export default Navbar;
