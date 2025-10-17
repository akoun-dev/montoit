import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ui/error-boundary";
import { initializeSentry } from "@/lib/sentry-enhanced";
import { SarahChatbot } from "@/components/SarahChatbot";
import { usePrefetchRoutes } from "@/hooks/usePrefetchRoutes";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import BottomNavigation from "@/components/navigation/BottomNavigation";
import { PageSkeleton, PropertyDetailSkeleton } from "@/components/LoadingFallback";
import ContextBar from "@/components/ContextBar";
import { ScrollProgress } from "@/components/animations/ScrollProgress";
import { InstallPWA } from "@/components/pwa/InstallPWA";
import { SplashScreen } from "@/components/pwa/SplashScreen";
import { PageTransition } from "@/components/animations/PageTransition";

// Eager load critical pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Search from "./pages/Search";

// Lazy load heavy pages
const PropertyDetail = lazy(() => import("./pages/PropertyDetail"));
const Offline = lazy(() => import("./pages/Offline"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminCertifications = lazy(() => import("./pages/AdminCertifications"));
const OwnerDashboard = lazy(() => import("./pages/OwnerDashboard"));
const TenantDashboard = lazy(() => import("./pages/TenantDashboard"));
const AgencyDashboard = lazy(() => import("./pages/AgencyDashboard"));
const MyMandates = lazy(() => import("./pages/MyMandates"));
const MyProperties = lazy(() => import("./pages/MyProperties"));
const AddProperty = lazy(() => import("./pages/AddProperty"));
const EditProperty = lazy(() => import("./pages/EditProperty"));
const Messages = lazy(() => import("./pages/Messages"));
const Application = lazy(() => import("./pages/Application"));
const Applications = lazy(() => import("./pages/Applications"));
const Leases = lazy(() => import("./pages/Leases"));
const Payments = lazy(() => import("./pages/Payments"));
const Maintenance = lazy(() => import("./pages/Maintenance"));
const ScheduleVisit = lazy(() => import("./pages/ScheduleVisit"));

// Load other pages normally
import Certification from "./pages/Certification";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Favorites from "./pages/Favorites";
import PropertyApplications from "./pages/PropertyApplications";
import Verification from "./pages/Verification";
import { GuestMessagesInbox } from "@/components/owner/GuestMessagesInbox";
import NotFound from "./pages/NotFound";
import UserReviews from "./pages/UserReviews";
import Publier from "./pages/Publier";
import APropos from "./pages/APropos";
import Conditions from "./pages/Conditions";
import Confidentialite from "./pages/Confidentialite";
import MentionsLegales from "./pages/MentionsLegales";
import TiersDeConfianceDashboard from "./pages/TiersDeConfianceDashboard";
import CertificationFAQ from "./pages/CertificationFAQ";
import Tarifs from "./pages/Tarifs";
import PopulateImages from "./pages/PopulateImages";
import TestCryptoNeo from "./pages/TestCryptoNeo";
import Guide from "./pages/Guide";
import Explorer from "./pages/Explorer";
import CommentCaMarche from "./pages/CommentCaMarche";
import HowItWorksPage from "./pages/HowItWorksPage";
import AboutPage from "./pages/AboutPage";
import SmartMap from "./pages/SmartMap";
import SmartMapV2 from "./pages/SmartMapV2";

import MandatesHelp from "./pages/MandatesHelp";

// Initialiser Sentry au démarrage de l'application
initializeSentry();

const AppContent = () => {
  // ✅ Préchargement intelligent des routes
  usePrefetchRoutes();

  // ✅ Raccourcis clavier globaux (accessibilité)
  useKeyboardShortcuts();
  
  const location = useLocation();
  const prevLocation = useRef(location.pathname);
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  useEffect(() => {
    const routes = ['/', '/recherche', '/favoris', '/messages', '/profil'];
    const currentIndex = routes.indexOf(location.pathname);
    const prevIndex = routes.indexOf(prevLocation.current);
    
    if (currentIndex !== -1 && prevIndex !== -1) {
      setDirection(currentIndex > prevIndex ? 'right' : 'left');
    }
    
    prevLocation.current = location.pathname;
  }, [location.pathname]);
  
  return (
    <>
      <SplashScreen />
      <ScrollProgress />
      <InstallPWA />
      {/* Skip link pour accessibilité */}
      <a href="#main-content" className="skip-to-main">
        Aller au contenu principal
      </a>
      
      <ContextBar />
      <SarahChatbot />
      <main id="main-content" tabIndex={-1}>
        <PageTransition>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/offline" element={<Suspense fallback={<PageSkeleton />}><Offline /></Suspense>} />
            <Route path="/recherche" element={<Search />} />
            <Route path="/explorer" element={<Explorer />} />
            <Route path="/carte-intelligente" element={<SmartMapV2 />} />
            <Route path="/comment-ca-marche" element={<HowItWorksPage />} />
            <Route path="/a-propos" element={<AboutPage />} />
            <Route path="/property/:id" element={
              <Suspense fallback={<PropertyDetailSkeleton />}>
                <PropertyDetail />
              </Suspense>
            } />
            <Route path="/certification" element={<Certification />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/guide" element={<Guide />} />
            <Route
              path="/profil" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <Dashboard />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
                  <Suspense fallback={<PageSkeleton />}>
                    <AdminDashboard />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/certifications" 
              element={
                <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
                  <Suspense fallback={<PageSkeleton />}>
                    <AdminCertifications />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/analytics" 
              element={
                <ProtectedRoute allowedUserTypes={['proprietaire', 'agence']}>
                  <Suspense fallback={<PageSkeleton />}>
                    <OwnerDashboard />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/tenant" 
              element={
                <ProtectedRoute allowedUserTypes={['locataire']}>
                  <Suspense fallback={<PageSkeleton />}>
                    <TenantDashboard />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
          <Route 
            path="/tiers-dashboard" 
            element={
              <ProtectedRoute requiredRoles={['tiers_de_confiance']}>
                <TiersDeConfianceDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/agence" 
            element={
              <ProtectedRoute allowedUserTypes={['agence']}>
                <Suspense fallback={<PageSkeleton />}>
                  <AgencyDashboard />
                </Suspense>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/my-mandates" 
            element={
              <ProtectedRoute allowedUserTypes={['proprietaire', 'agence']}>
                <Suspense fallback={<PageSkeleton />}>
                  <MyMandates />
                </Suspense>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/mandates/help" 
            element={
              <ProtectedRoute allowedUserTypes={['proprietaire', 'agence']}>
                <MandatesHelp />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/owner/guest-messages" 
            element={
              <ProtectedRoute allowedUserTypes={['proprietaire', 'agence']}>
                <GuestMessagesInbox />
              </ProtectedRoute>
            } 
          />
            <Route
              path="/favoris" 
              element={
                <ProtectedRoute>
                  <Favorites />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/messages" 
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <Messages />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/mes-biens" 
              element={
                <ProtectedRoute allowedUserTypes={['proprietaire', 'agence']}>
                  <Suspense fallback={<PageSkeleton />}>
                    <MyProperties />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/ajouter-bien" 
              element={
                <ProtectedRoute allowedUserTypes={['proprietaire', 'agence']}>
                  <Suspense fallback={<PageSkeleton />}>
                    <AddProperty />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/biens/:id/modifier" 
              element={
                <ProtectedRoute allowedUserTypes={['proprietaire', 'agence']}>
                  <Suspense fallback={<PageSkeleton />}>
                    <EditProperty />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/biens/:id/candidatures" 
              element={
                <ProtectedRoute allowedUserTypes={['proprietaire', 'agence']}>
                  <PropertyApplications />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/maintenance/:propertyId" 
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <Maintenance />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/application/:propertyId" 
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <Application />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/schedule-visit/:propertyId" 
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <ScheduleVisit />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/candidatures"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <Applications />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/baux" 
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <Leases />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/payments" 
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <Payments />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/verification" 
              element={
                <ProtectedRoute>
                  <Verification />
                </ProtectedRoute>
              } 
            />
            <Route path="/user/:userId/reviews" element={<UserReviews />} />
            <Route path="/publier" element={<Publier />} />
            <Route path="/a-propos" element={<APropos />} />
            <Route path="/conditions" element={<Conditions />} />
            <Route path="/confidentialite" element={<Confidentialite />} />
            <Route path="/mentions-legales" element={<MentionsLegales />} />
            <Route path="/certification-faq" element={<CertificationFAQ />} />
            <Route path="/tarifs" element={<Tarifs />} />
            
            <Route 
              path="/populate-images" 
              element={
                <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
                  <PopulateImages />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/test-cryptoneo" 
              element={
                <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
                  <TestCryptoNeo />
                </ProtectedRoute>
              } 
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </PageTransition>
      </main>
      <BottomNavigation />
    </>
  );
};

const App = () => (
  <ErrorBoundary level="error">
    <HelmetProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ErrorBoundary level="warning">
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
