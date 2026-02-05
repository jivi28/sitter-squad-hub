import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [status, setStatus] = useState("Setting up your account...");
  
  useEffect(() => {
    // Listen for auth state change - this is more reliable than getSession after OAuth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthCallback: auth event:', event, 'session:', !!session);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // User just signed in via OAuth
          await handleAuthComplete(session.user.id);
        } else if (event === 'INITIAL_SESSION') {
          // Page load - check if there's already a session
          if (session?.user) {
            await handleAuthComplete(session.user.id);
          } else {
            // No session, redirect to auth
            console.log('AuthCallback: No session on initial load');
            navigate('/auth');
          }
        }
      }
    );

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthComplete = async (userId: string) => {
    try {
      setStatus("Checking your account...");
      
      // Get the pending role from OAuth flow (stored before redirect)
      // This represents the user's EXPLICIT choice during signup
      const pendingRole = searchParams.get('role') || localStorage.getItem('pending_role');
      console.log('AuthCallback: pendingRole from URL/localStorage:', pendingRole);
      
      // Check if user already has a conflicting role
      if (pendingRole === 'sitter' || pendingRole === 'parent') {
        const { data: hasConflict, error: conflictError } = await supabase
          .rpc('has_conflicting_role', { 
            _user_id: userId, 
            _intended_role: pendingRole 
          });
        
        if (conflictError) {
          console.error('Error checking role conflict:', conflictError);
        }
        
        if (hasConflict) {
          const existingRole = pendingRole === 'sitter' ? 'parent' : 'sitter';
          toast({
            title: "Account Already Exists",
            description: `This email is already registered as a ${existingRole}. You cannot use the same email for both parent and sitter accounts.`,
            variant: "destructive",
          });
          
          // Sign out and redirect to auth
          await supabase.auth.signOut();
          localStorage.removeItem('pending_role');
          localStorage.removeItem('user_role');
          navigate('/auth');
          return;
        }
      }
      
      // Check actual roles from database
      const { data: dbRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      const roleSet = new Set(dbRoles?.map(r => r.role) || []);
      console.log('AuthCallback: DB roles:', Array.from(roleSet));
      
      // Check if user has a completed sitter profile
      const { data: existingSitter } = await supabase
        .from('sitters')
        .select('id, approved_at')
        .eq('user_id', userId)
        .maybeSingle();
      
      const hasCompletedSitterProfile = !!existingSitter;
      const isApprovedSitter = !!existingSitter?.approved_at;
      
      // Determine role with this priority:
      // 1. If pending_role is 'sitter' -> route to sitter flow (user explicitly chose)
      // 2. If user has a completed sitter profile in DB -> they're a sitter
      // 3. If pending_role is 'parent' -> route to parent flow
      // 4. Check DB roles as fallback
      // 5. Default to parent
      let role: string;

      if (pendingRole === 'sitter') {
        role = 'sitter';
        console.log('AuthCallback: Using pending sitter role (user explicit choice)');
      } else if (hasCompletedSitterProfile) {
        role = 'sitter';
        console.log('AuthCallback: User has existing sitter profile');
      } else if (pendingRole === 'parent') {
        role = 'parent';
        console.log('AuthCallback: Using pending parent role (user explicit choice)');
      } else if (roleSet.has('sitter')) {
        role = 'sitter';
      } else if (roleSet.has('parent')) {
        role = 'parent';
      } else {
        role = 'parent';
      }

      console.log('AuthCallback: Final determined role:', role);
      
      // Sync localStorage with determined role
      localStorage.setItem('user_role', role);
      localStorage.removeItem('pending_role');

      if (role === 'sitter') {
        if (!hasCompletedSitterProfile) {
          console.log('AuthCallback: No sitter profile, redirecting to signup');
          navigate('/sitter-signup');
          return;
        }
        
        if (!isApprovedSitter) {
          console.log('AuthCallback: Sitter not approved, redirecting to signup');
          navigate('/sitter-signup');
          return;
        }

        console.log('AuthCallback: Approved sitter, redirecting to dashboard');
        navigate('/sitter-dashboard');
        return;
      }

      // Parent role - check for complete profile
      setStatus("Loading your profile...");
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error checking profile:', profileError);
      }

      // Determine profile completeness
      const isNonEmpty = (v: any) => v != null && typeof v === 'string' && v.trim().length > 0;
      const essentialsComplete = !!profileData &&
                           isNonEmpty(profileData.first_name) &&
                           isNonEmpty(profileData.last_name) &&
                           isNonEmpty(profileData.phone) &&
                           isNonEmpty(profileData.address);
      
      const hasChildren = typeof profileData?.num_children === 'number' && profileData.num_children > 0;
      const hasPets = typeof profileData?.num_pets === 'number' && profileData.num_pets > 0;
      const hasChildrenOrPets = hasChildren || hasPets;
      
      const childrenInfoOk = !hasChildren || isNonEmpty(profileData?.children_ages);
      const petsInfoOk = !hasPets || isNonEmpty(profileData?.pet_details);
      
      const isComplete = essentialsComplete && hasChildrenOrPets && childrenInfoOk && petsInfoOk;

      if (!isComplete) {
        navigate('/parent-signup');
        return;
      }

      // Profile complete, check for bookings to decide which tab
      const { data: bookings } = await supabase
        .from('bookings')
        .select('status, payment_status')
        .eq('user_id', userId);

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
      toast({
        title: "Something went wrong",
        description: "Please try signing in again.",
        variant: "destructive",
      });
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">{status}</p>
      </div>
    </div>
  );
};

export default AuthCallback;