import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import BookingSystem from "@/components/BookingSystem";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { user, loading } = useAuth();
  const [hasCompleteProfile, setHasCompleteProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const checkProfile = async () => {
      if (loading) return;
      
      if (!user) {
        setProfileLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          // Check if all required fields are filled
          const isComplete = !!(
            data.first_name &&
            data.last_name &&
            data.phone &&
            data.address &&
            data.num_children &&
            data.children_ages
          );
          setHasCompleteProfile(isComplete);
        }
      } catch (error) {
        console.error('Error checking profile:', error);
      } finally {
        setProfileLoading(false);
      }
    };

    checkProfile();
  }, [user, loading]);

  // Show booking section if:
  // - User is not logged in (allow browsing)
  // - User is logged in AND has complete profile
  const showBookingSection = !user || (user && hasCompleteProfile);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <HowItWorks />
      {showBookingSection && <BookingSystem />}
    </div>
  );
};

export default Index;
