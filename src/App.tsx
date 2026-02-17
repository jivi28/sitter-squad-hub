import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardSkeleton } from "./components/LoadingSkeleton";
import { AuthProvider } from "./hooks/useAuth";
import SkipToContent from "./components/SkipToContent";
import KeyboardShortcutsHelp from "./components/KeyboardShortcutsHelp";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

// Eager load landing page for instant first paint
import Index from "./pages/Index";

// Lazy load all other routes for code splitting
const About = lazy(() => import("./pages/About"));
const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ParentSignup = lazy(() => import("./pages/ParentSignup"));
const SitterSignup = lazy(() => import("./pages/SitterSignup"));
const SitterAuth = lazy(() => import("./pages/SitterAuth"));
const SitterDashboard = lazy(() => import("./pages/SitterDashboard"));
const ParentDashboard = lazy(() => import("./pages/ParentDashboard"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const SecuritySelfTest = lazy(() => import("./pages/SecuritySelfTest"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Wrapper component for keyboard shortcuts
const AppContent = () => {
  useKeyboardShortcuts();

  // Add keyboard navigation class when Tab is pressed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-nav');
      }
    };

    const handleMouseDown = () => {
      document.body.classList.remove('keyboard-nav');
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <SkipToContent />
      <KeyboardShortcutsHelp />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/about" element={<About />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth-callback" element={<AuthCallback />} />
        <Route path="/parent-signup" element={<ParentSignup />} />
        <Route path="/parent-dashboard" element={<ParentDashboard />} />
        <Route path="/sitter-signup" element={<SitterSignup />} />
        <Route path="/sitter-auth" element={<SitterAuth />} />
        <Route path="/sitter-dashboard" element={<SitterDashboard />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/security-self-test" element={<SecuritySelfTest />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
