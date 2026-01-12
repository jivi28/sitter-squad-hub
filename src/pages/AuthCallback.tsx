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
      
      // Check actual roles from database first
      const { data: dbRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      const roleSet = new Set(dbRoles?.map(r => r.role) || []);
      
      // Get the pending role from OAuth flow (stored before redirect)
      const pendingRole = searchParams.get('role') || localStorage.getItem('pending_role');
      
      // Determine role:
      // - If user already has BOTH roles, respect the user's explicit choice from the OAuth flow when present.
      // - If user is already a sitter, always keep sitter (sitter experience should not be blocked by parent role).
      // - If user selected "sitter" during this OAuth attempt, route them to sitter onboarding even if a parent role exists.
      // - Otherwise fall back to existing DB roles.
      let role: string;

      const pendingIsValid = pendingRole === 'sitter' || pendingRole === 'parent';

      if (roleSet.has('sitter') && roleSet.has('parent')) {
        // Dual-role user: honor explicit choice if provided.
        role = pendingIsValid
          ? pendingRole
          : (localStorage.getItem('user_role') === 'sitter' || localStorage.getItem('user_role') === 'parent')
            ? (localStorage.getItem('user_role') as string)
            : 'parent';
      } else if (roleSet.has('sitter')) {
        role = 'sitter';
      } else if (pendingRole === 'sitter') {
        // Important: a new sitter applicant may already have a 'parent' role due to profile triggers.
        role = 'sitter';
      } else if (roleSet.has('parent')) {
        role = 'parent';
      } else if (pendingRole === 'parent') {
        role = 'parent';
      } else {
        role = 'parent';
      }
      
      console.log('AuthCallback - determined role:', role, 'pendingRole:', pendingRole, 'dbRoles:', Array.from(roleSet));
      
      // Sync localStorage with determined role
      localStorage.setItem('user_role', role);
      localStorage.removeItem('pending_role');

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

      // Determine profile completeness with tolerant rules (handles NULL and empty strings)
      // Requires: essentials + (children OR pets) with their details
      const isNonEmpty = (v: any) => v != null && typeof v === 'string' && v.trim().length > 0;
      const essentialsComplete = !!profileData &&
                           isNonEmpty(profileData.first_name) &&
                           isNonEmpty(profileData.last_name) &&
                           isNonEmpty(profileData.phone) &&
                           isNonEmpty(profileData.address);
      
      // Must have at least children OR pets
      const hasChildren = typeof profileData?.num_children === 'number' && profileData.num_children > 0;
      const hasPets = typeof profileData?.num_pets === 'number' && profileData.num_pets > 0;
      const hasChildrenOrPets = hasChildren || hasPets;
      
      // If has children, must have ages. If has pets, must have details.
      const childrenInfoOk = !hasChildren || isNonEmpty(profileData?.children_ages);
      const petsInfoOk = !hasPets || isNonEmpty(profileData?.pet_details);
      
      const isComplete = essentialsComplete && hasChildrenOrPets && childrenInfoOk && petsInfoOk;

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
