import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        navigate('/auth');
        return;
      }

      if (!session?.user) {
        console.error('No user in session');
        navigate('/auth');
        return;
      }

      const userId = session.user.id;
      const role = searchParams.get('role') || localStorage.getItem('pending_role') || 'parent';
      
      // Store role in localStorage
      localStorage.setItem('user_role', role);

      if (role === 'sitter') {
        // Check if sitter profile exists and is complete
        const { data: sitterData, error: sitterError } = await supabase
          .from('sitters')
          .select('id, status, approved_at')
          .eq('user_id', userId)
          .maybeSingle();

        if (sitterError) {
          console.error('Error checking sitter profile:', sitterError);
        }

        // If no profile or not approved, go to signup
        if (!sitterData || !sitterData.approved_at) {
          navigate('/sitter-signup');
          return;
        }

        // Has complete profile, go to dashboard
        navigate('/sitter-dashboard');
        return;
      }

      // Parent role - check for complete profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error checking profile:', profileError);
      }

      // Determine profile completeness with tolerant rules
      const isNonEmpty = (v: any) => typeof v === 'string' && v.trim().length > 0;
      const essentialsComplete = !!profileData &&
                           isNonEmpty(profileData.first_name) &&
                           isNonEmpty(profileData.last_name) &&
                           isNonEmpty(profileData.phone) &&
                           isNonEmpty(profileData.address);
      const validNumChildren = typeof profileData?.num_children === 'number' && profileData.num_children >= 0;
      const childrenInfoOk = profileData?.num_children === 0 ? true : isNonEmpty(profileData?.children_ages);
      const isComplete = essentialsComplete && validNumChildren && childrenInfoOk;

      if (!isComplete) {
        // Profile incomplete, go to signup
        navigate('/parent-signup');
        return;
      }

      // Profile complete, check for bookings to decide which tab
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      const hasActiveBookings = bookings?.some(booking => 
        booking.status === 'pending' || 
        booking.status === 'confirmed' || 
        booking.payment_status === 'pending'
      );

      if (hasActiveBookings) {
        navigate('/parent-dashboard?tab=bookings');
      } else {
        navigate('/parent-dashboard?tab=book-sitter');
      }

    } catch (error) {
      console.error('Auth callback error:', error);
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Setting up your account...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
