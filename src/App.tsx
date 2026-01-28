import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StoreProvider } from "@/contexts/StoreContext";
import { AdminRoute, AppRoute, AuthenticatedRoute, PublicOnlyRoute } from "@/components/routes/ProtectedRoutes";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";

// Public pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/AuthCallback";
import Forbidden from "./pages/Forbidden";

// Auth/Security pages
import SecurityCheck from "./pages/SecurityCheck";
import Onboarding from "./pages/Onboarding";
import StoreOnboarding from "./pages/StoreOnboarding";

// App pages (end users)
import Dashboard from "./pages/Dashboard";
import BusinessArea from "./pages/BusinessArea";
import Ingredients from "./pages/Ingredients";
import Beverages from "./pages/Beverages";
import Recipes from "./pages/Recipes";
import SubRecipes from "./pages/SubRecipes";

// Admin pages (master/collaborators)
import AdminDashboard from "./pages/AdminDashboard";
import Collaborators from "./pages/Collaborators";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <StoreProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ImpersonationBanner />
          <Routes>
            {/* ========== PUBLIC ROUTES ========== */}
            <Route path="/" element={<Landing />} />
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
            {/* Master and collaborators will be automatically redirected to /admin */}
            <Route 
              path="/app" 
              element={
                <AppRoute>
                  <Dashboard />
                </AppRoute>
              } 
            />
            <Route 
              path="/app/dashboard" 
              element={
                <AppRoute>
                  <Dashboard />
                </AppRoute>
              } 
            />
            <Route 
              path="/app/business" 
              element={
                <AppRoute>
                  <BusinessArea />
                </AppRoute>
              } 
            />
            <Route 
              path="/app/ingredients" 
              element={
                <AppRoute>
                  <Ingredients />
                </AppRoute>
              } 
            />
            <Route 
              path="/app/beverages" 
              element={
                <AppRoute>
                  <Beverages />
                </AppRoute>
              } 
            />
            <Route 
              path="/app/recipes" 
              element={
                <AppRoute>
                  <Recipes />
                </AppRoute>
              } 
            />
            <Route 
              path="/app/sub-recipes" 
              element={
                <AppRoute>
                  <SubRecipes />
                </AppRoute>
              } 
            />

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

            {/* ========== LEGACY ROUTES (Redirect to new structure) ========== */}
            {/* These maintain backwards compatibility */}
            <Route path="/dashboard" element={<Navigate to="/app" replace />} />
            <Route path="/business" element={<Navigate to="/app/business" replace />} />
            <Route path="/ingredients" element={<Navigate to="/app/ingredients" replace />} />
            <Route path="/beverages" element={<Navigate to="/app/beverages" replace />} />
            <Route path="/recipes" element={<Navigate to="/app/recipes" replace />} />
            <Route path="/sub-recipes" element={<Navigate to="/app/sub-recipes" replace />} />
            <Route path="/collaborators" element={<Navigate to="/admin/collaborators" replace />} />

            {/* ========== ERROR PAGES ========== */}
            <Route path="/403" element={<Forbidden />} />
            
            {/* ========== 404 CATCH-ALL ========== */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </StoreProvider>
  </QueryClientProvider>
);

export default App;
