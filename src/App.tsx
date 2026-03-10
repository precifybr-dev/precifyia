import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StoreProvider } from "@/contexts/StoreContext";
import { AdminRoute, AppRoute, AuthenticatedRoute, PublicOnlyRoute } from "@/components/routes/ProtectedRoutes";
import { AppShell } from "@/components/layout/AppShell";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { ReadOnlyModeInterceptor } from "@/components/support/ReadOnlyModeInterceptor";
import { GoogleAnalyticsTracker } from "@/components/GoogleAnalyticsTracker";
import { CookieConsent } from "@/components/CookieConsent";

// Landing page loaded eagerly (it's the entry point)
import Landing from "./pages/Landing";

// Lazy-loaded pages - split into separate chunks
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const Forbidden = lazy(() => import("./pages/Forbidden"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const ServiceContract = lazy(() => import("./pages/ServiceContract"));
const AntiFraudPolicy = lazy(() => import("./pages/AntiFraudPolicy"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const CancellationPolicy = lazy(() => import("./pages/CancellationPolicy"));
const ChargebackPolicy = lazy(() => import("./pages/ChargebackPolicy"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const PublicHelp = lazy(() => import("./pages/PublicHelp"));

// Feature landing pages
const PrecificacaoIfood = lazy(() => import("./pages/features/PrecificacaoIfood"));
const FichaTecnicaAutomatica = lazy(() => import("./pages/features/FichaTecnicaAutomatica"));
const AnaliseInteligenteCardapio = lazy(() => import("./pages/features/AnaliseInteligenteCardapio"));
const SimuladorCombos = lazy(() => import("./pages/features/SimuladorCombos"));
const ControleRealLucro = lazy(() => import("./pages/features/ControleRealLucro"));
const SimulacaoTaxasCustos = lazy(() => import("./pages/features/SimulacaoTaxasCustos"));

// Auth/Security pages
const SecurityCheck = lazy(() => import("./pages/SecurityCheck"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const StoreOnboarding = lazy(() => import("./pages/StoreOnboarding"));

// App pages (end users)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const BusinessArea = lazy(() => import("./pages/BusinessArea"));
const Ingredients = lazy(() => import("./pages/Ingredients"));
const Beverages = lazy(() => import("./pages/Beverages"));
const Recipes = lazy(() => import("./pages/Recipes"));
const SubRecipes = lazy(() => import("./pages/SubRecipes"));
const Combos = lazy(() => import("./pages/Combos"));
const RecycleBin = lazy(() => import("./pages/RecycleBin"));
const UserSupport = lazy(() => import("./pages/UserSupport"));
const BackupRestore = lazy(() => import("./pages/BackupRestore"));
const University = lazy(() => import("./pages/University"));
const MenuMirror = lazy(() => import("./pages/MenuMirror"));
const CMVGlobal = lazy(() => import("./pages/CMVGlobal"));
const MyPlan = lazy(() => import("./pages/MyPlan"));
const Packagings = lazy(() => import("./pages/Packagings"));
const DrMargemReports = lazy(() => import("./pages/DrMargemReports"));

// Admin pages (master/collaborators)
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Collaborators = lazy(() => import("./pages/Collaborators"));
const SystemBook = lazy(() => import("./pages/SystemBook"));
const AdminExport = lazy(() => import("./pages/AdminExport"));

// Contextual help lazy loaded
const ContextualHelp = lazy(() => import("@/components/help/ContextualHelp").then(m => ({ default: m.ContextualHelp })));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <StoreProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ImpersonationBanner />
          <ReadOnlyModeInterceptor />
          <Suspense fallback={null}>
            <ContextualHelp />
          </Suspense>
          <GoogleAnalyticsTracker />
          <CookieConsent />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* ========== PUBLIC ROUTES ========== */}
              <Route path="/" element={<Landing />} />
              <Route path="/contrato" element={<ServiceContract />} />
              <Route path="/termos" element={<TermsOfUse />} />
              <Route path="/privacidade" element={<PrivacyPolicy />} />
              <Route path="/politica-antifraude" element={<AntiFraudPolicy />} />
              <Route path="/cancelamento" element={<CancellationPolicy />} />
              <Route path="/chargeback" element={<ChargebackPolicy />} />
              <Route path="/cookies" element={<CookiePolicy />} />
              <Route path="/ajuda" element={<PublicHelp />} />
              
              {/* Feature landing pages */}
              <Route path="/funcionalidades/precificacao-ifood" element={<PrecificacaoIfood />} />
              <Route path="/funcionalidades/ficha-tecnica-automatica" element={<FichaTecnicaAutomatica />} />
              <Route path="/funcionalidades/analise-inteligente-cardapio" element={<AnaliseInteligenteCardapio />} />
              <Route path="/funcionalidades/simulador-de-combos" element={<SimuladorCombos />} />
              <Route path="/funcionalidades/controle-real-de-lucro" element={<ControleRealLucro />} />
              <Route path="/funcionalidades/simulacao-de-taxas-e-custos" element={<SimulacaoTaxasCustos />} />
              <Route 
                path="/login" 
                element={
                  <PublicOnlyRoute>
                    <Login />
                  </PublicOnlyRoute>
                } 
              />
              <Route 
                path="/register" 
                element={
                  <PublicOnlyRoute>
                    <Register />
                  </PublicOnlyRoute>
                } 
              />
              <Route 
                path="/forgot-password" 
                element={
                  <PublicOnlyRoute>
                    <ForgotPassword />
                  </PublicOnlyRoute>
                } 
              />
              <Route path="/reset-password" element={<ResetPassword />} />
              
              {/* OAuth callback - handles role-based redirect */}
              <Route path="/auth-callback" element={<AuthCallback />} />
              
              {/* ========== AUTH/SECURITY ROUTES ========== */}
              <Route 
                path="/security-check" 
                element={
                  <AuthenticatedRoute>
                    <SecurityCheck />
                  </AuthenticatedRoute>
                } 
              />
              <Route 
                path="/onboarding" 
                element={
                  <AuthenticatedRoute>
                    <Onboarding />
                  </AuthenticatedRoute>
                } 
              />
              <Route 
                path="/store-onboarding/:storeId" 
                element={
                  <AuthenticatedRoute>
                    <StoreOnboarding />
                  </AuthenticatedRoute>
                } 
              />

              {/* ========== APP ROUTES (End Users Only) ========== */}
              {/* Shell layout: sidebar stays mounted, only content swaps with shimmer */}
              <Route path="/app" element={<AppRoute><AppShell /></AppRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="business" element={<BusinessArea />} />
                <Route path="ingredients" element={<Ingredients />} />
                <Route path="beverages" element={<Beverages />} />
                <Route path="recipes" element={<Recipes />} />
                <Route path="sub-recipes" element={<SubRecipes />} />
                <Route path="packagings" element={<Packagings />} />
                <Route path="combos" element={<Combos />} />
                <Route path="recycle-bin" element={<RecycleBin />} />
                <Route path="help" element={<HelpCenter />} />
                <Route path="support" element={<UserSupport />} />
                <Route path="menu" element={<MenuMirror />} />
                <Route path="universidade" element={<University />} />
                <Route path="cmv" element={<CMVGlobal />} />
                <Route path="plan" element={<MyPlan />} />
                <Route path="reports" element={<DrMargemReports />} />
                <Route path="backup" element={<BackupRestore />} />
              </Route>

              {/* ========== ADMIN ROUTES (Master/Collaborators Only) ========== */}
              {/* Regular users cannot access these routes */}
              <Route 
                path="/admin" 
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                } 
              />
              <Route 
                path="/admin/collaborators" 
                element={
                  <AdminRoute>
                    <Collaborators />
                  </AdminRoute>
                } 
              />
              <Route 
                path="/admin/export" 
                element={
                  <AdminRoute>
                    <AdminExport />
                  </AdminRoute>
                } 
              />
              <Route 
                path="/admin/system-book" 
                element={
                  <AdminRoute>
                    <SystemBook />
                  </AdminRoute>
                } 
              />

              {/* ========== LEGACY ROUTES (Redirect to new structure) ========== */}
              {/* These maintain backwards compatibility */}
              <Route path="/dashboard" element={<Navigate to="/app" replace />} />
              <Route path="/business" element={<Navigate to="/app/business" replace />} />
              <Route path="/ingredients" element={<Navigate to="/app/ingredients" replace />} />
              <Route path="/beverages" element={<Navigate to="/app/beverages" replace />} />
              <Route path="/recipes" element={<Navigate to="/app/recipes" replace />} />
              <Route path="/sub-recipes" element={<Navigate to="/app/sub-recipes" replace />} />
              <Route path="/collaborators" element={<Navigate to="/admin/collaborators" replace />} />

              {/* Help/Support/etc routes are now nested under /app shell above */}

              {/* ========== ERROR PAGES ========== */}
              <Route path="/403" element={<Forbidden />} />
              
              {/* ========== 404 CATCH-ALL ========== */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </StoreProvider>
  </QueryClientProvider>
);

export default App;
