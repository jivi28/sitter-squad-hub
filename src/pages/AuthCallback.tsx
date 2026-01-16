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
      // This is CRITICAL: The pending_role represents the user's EXPLICIT choice during signup
      const pendingRole = searchParams.get('role') || localStorage.getItem('pending_role');
      const pendingIsValid = pendingRole === 'sitter' || pendingRole === 'parent';
      
      // Check if user has a completed sitter profile (not just the role)
      const { data: existingSitter } = await supabase
        .from('sitters')
        .select('id, approved_at')
        .eq('user_id', userId)
        .maybeSingle();
      
      const hasCompletedSitterProfile = !!existingSitter;
      const isApprovedSitter = !!existingSitter?.approved_at;
      
      // Determine role with this priority:
      // 1. If pending_role is 'sitter' -> ALWAYS route to sitter flow (user explicitly chose sitter)
      //    (A parent role may exist due to auto-profile-creation trigger, ignore it for new sitter signups)
      // 2. If user has a completed sitter profile in DB -> they're a sitter
      // 3. If pending_role is 'parent' -> route to parent flow
      // 4. Check DB roles as fallback
      // 5. Default to parent
      let role: string;

      if (pendingRole === 'sitter') {
        // User explicitly selected "Become a Sitter" - this takes priority over any auto-assigned parent role
        role = 'sitter';
        console.log('AuthCallback: Using pending sitter role (user explicit choice)');
      } else if (hasCompletedSitterProfile) {
        // User has a sitter profile in DB - they're a sitter
        role = 'sitter';
        console.log('AuthCallback: User has existing sitter profile');
      } else if (pendingRole === 'parent') {
        // User explicitly selected "Book a Sitter"
        role = 'parent';
        console.log('AuthCallback: Using pending parent role (user explicit choice)');
      } else if (roleSet.has('sitter')) {
        // DB says sitter (shouldn't happen without sitter profile, but handle it)
        role = 'sitter';
      } else if (roleSet.has('parent')) {
        // DB says parent and no pending role - existing parent user
        role = 'parent';
      } else {
        // No role info at all - default to parent
        role = 'parent';
      }

      console.log('AuthCallback - determined role:', role, 'pendingRole:', pendingRole, 'dbRoles:', Array.from(roleSet));
      
      // Sync localStorage with determined role
      localStorage.setItem('user_role', role);
      localStorage.removeItem('pending_role');

      if (role === 'sitter') {
        // We already checked for sitter profile above, reuse that data
        // If no profile or not approved, go to signup
        if (!isApprovedSitter) {
          console.log('AuthCallback: Sitter not approved, redirecting to signup');
          navigate('/sitter-signup');
          return;
        }

        // Has approved profile, go to dashboard
        console.log('AuthCallback: Approved sitter, redirecting to dashboard');
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
