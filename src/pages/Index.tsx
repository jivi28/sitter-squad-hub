import { useEffect } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { user, loading } = useAuth();

  const getSmartRedirect = async (userId: string): Promise<string> => {
    try {
      // Fetch user's bookings to determine their status
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bookings:', error);
        return '/parent-dashboard?tab=book-sitter'; // Default for new users
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
      return '/parent-dashboard?tab=book-sitter'; // Safe fallback
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <Hero />
      <HowItWorks />
    </div>
  );
};

export default Index;
