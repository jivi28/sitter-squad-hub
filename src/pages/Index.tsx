import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { detectUserRole } from "@/utils/roleDetection";
import { motion } from "framer-motion";

/**
 * Determines the appropriate dashboard route for an authenticated user.
 * Priority: sitter-only → sitter-dashboard, otherwise parent flow.
 */
const resolveRedirectPath = async (userId: string): Promise<string> => {
  // 1. Detect roles
  const roles = await detectUserRole(userId);

  // Edge case: no roles assigned at all
  if (!roles.isParent && !roles.isSitter) {
    console.warn("Index: User has no roles, defaulting to parent signup");
    return "/parent-signup";
  }

  // Sitter-only → sitter dashboard
  if (roles.isSitter && !roles.isParent) {
    return "/sitter-dashboard";
  }

  // Parent (or dual-role) → check for active bookings using minimal query
  const { data: activeBooking, error } = await supabase
    .from("bookings")
    .select("id")
    .eq("user_id", userId)
    .or("status.eq.pending,status.eq.confirmed,payment_status.eq.pending")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Index: Error checking active bookings:", error);
    return "/parent-dashboard?tab=book-sitter";
  }

  return activeBooking
    ? "/parent-dashboard?tab=bookings"
    : "/parent-dashboard?tab=book-sitter";
};

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (loading || !user || redirectedRef.current) return;

    // Guard against double execution
    redirectedRef.current = true;

    resolveRedirectPath(user.id)
      .then((path) => navigate(path, { replace: true }))
      .catch((err) => {
        console.error("Index: Redirect failed:", err);
        navigate("/parent-dashboard?tab=book-sitter", { replace: true });
      });
  }, [user, loading, navigate]);

  // Show spinner while auth is loading or redirect is in progress
  if (loading || user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-muted-foreground">Loading...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <main id="main-content" role="main">
        <Hero />
        <HowItWorks />
      </main>
    </div>
  );
};

export default Index;
