import { useEffect } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { detectUserRole } from "@/utils/roleDetection";
import { motion } from "framer-motion";

const Index = () => {
  const { user, loading } = useAuth();

  const getSmartRedirect = async (userId: string): Promise<string> => {
    try {
      // Detect user role first
      const roles = await detectUserRole(userId);

      // If user is only a sitter, redirect to sitter dashboard
      if (roles.isSitter && !roles.isParent) {
        return '/sitter-dashboard';
      }

      // If user has both roles, prioritize parent dashboard (or you could add a role selector)
      // For now, parent dashboard is default for dual-role users

      // Fetch user's bookings to determine their status (parent flow)
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bookings:', error);
        return '/parent-dashboard?tab=book-sitter';
      }

      // No bookings = new user, guide to booking
      if (!bookings || bookings.length === 0) {
        return '/parent-dashboard?tab=book-sitter';
      }

      // Check for active bookings that need attention
      const hasActiveBookings = bookings.some(booking => 
        booking.status === 'pending' || 
        booking.status === 'confirmed' || 
        booking.payment_status === 'pending'
      );

      // Users with active bookings should see their booking history
      if (hasActiveBookings) {
        return '/parent-dashboard?tab=bookings';
      }

      // Users with only completed bookings can book again
      return '/parent-dashboard?tab=book-sitter';
    } catch (error) {
      console.error('Error in smart redirect:', error);
      return '/parent-dashboard?tab=book-sitter';
    }
  };

  // Redirect logged-in users to appropriate dashboard
  useEffect(() => {
    const handleRedirect = async () => {
      if (!loading && user) {
        const redirectUrl = await getSmartRedirect(user.id);
        window.location.href = redirectUrl;
      }
    };

    handleRedirect();
  }, [user, loading]);

  // Show loading or redirect in progress
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
