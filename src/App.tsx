import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { StoreProvider } from "@/contexts/StoreContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import StoreOnboarding from "./pages/StoreOnboarding";
import BusinessArea from "./pages/BusinessArea";
import Ingredients from "./pages/Ingredients";
import Beverages from "./pages/Beverages";
import Recipes from "./pages/Recipes";
import SubRecipes from "./pages/SubRecipes";
import SecurityCheck from "./pages/SecurityCheck";
import Collaborators from "./pages/Collaborators";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <StoreProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/security-check" element={<SecurityCheck />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/store-onboarding/:storeId" element={<StoreOnboarding />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/business" element={<BusinessArea />} />
            <Route path="/ingredients" element={<Ingredients />} />
            <Route path="/beverages" element={<Beverages />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/sub-recipes" element={<SubRecipes />} />
            <Route path="/collaborators" element={<Collaborators />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </StoreProvider>
  </QueryClientProvider>
);

export default App;
