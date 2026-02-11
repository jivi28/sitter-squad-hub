import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { detectUserRole } from "@/utils/roleDetection";
import { motion } from "framer-motion";

const resolveRedirectPath = async (userId: string): Promise<string> => {
  const roles = await detectUserRole(userId);

  if (!roles.isParent && !roles.isSitter) {
    console.warn("Index: User has no roles, defaulting to parent signup");
    return "/parent-signup";
  }

  if (roles.isSitter && !roles.isParent) {
    return "/sitter-dashboard";
  }

  const { data: activeBooking, error } = await supabase
    .from("bookings")
    .select("id")
    .eq("user_id", userId)
    .or("status.in.(pending,confirmed),payment_status.eq.pending")
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
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (loading || !user || redirectedRef.current) return;

    redirectedRef.current = true;
    setRedirecting(true);

    resolveRedirectPath(user.id)
      .then((path) => navigate(path, { replace: true }))
      .catch((err) => {
        console.error("Index: Redirect failed:", err);
        navigate("/parent-dashboard?tab=book-sitter", { replace: true });
      })
      .finally(() => setRedirecting(false));
  }, [user, loading, navigate]);

  if (loading || redirecting) {
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
