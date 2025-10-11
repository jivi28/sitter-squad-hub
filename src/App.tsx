import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardSkeleton } from "./components/LoadingSkeleton";
import { AuthProvider } from "./hooks/useAuth";

// Eager load landing page for instant first paint
import Index from "./pages/Index";

// Lazy load all other routes for code splitting
const About = lazy(() => import("./pages/About"));
const Auth = lazy(() => import("./pages/Auth"));
const ParentSignup = lazy(() => import("./pages/ParentSignup"));
const SitterSignup = lazy(() => import("./pages/SitterSignup"));
const SitterAuth = lazy(() => import("./pages/SitterAuth"));
const SitterDashboard = lazy(() => import("./pages/SitterDashboard"));
const ParentDashboard = lazy(() => import("./pages/ParentDashboard"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<DashboardSkeleton />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/about" element={<About />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/parent-signup" element={<ParentSignup />} />
              <Route path="/parent-dashboard" element={<ParentDashboard />} />
              <Route path="/sitter-signup" element={<SitterSignup />} />
              <Route path="/sitter-auth" element={<SitterAuth />} />
              <Route path="/sitter-dashboard" element={<SitterDashboard />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
