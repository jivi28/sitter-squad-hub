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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthCallback: auth event:', event, 'session:', !!session);

        if (event === 'SIGNED_IN' && session?.user) {
          await handleAuthComplete(session.user.id, session.access_token);
        } else if (event === 'INITIAL_SESSION') {
          if (session?.user) {
            await handleAuthComplete(session.user.id, session.access_token);
          } else {
            navigate('/auth');
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthComplete = async (userId: string, _accessToken: string) => {
    try {
      setStatus("Checking your account...");

      // Role comes STRICTLY from URL param set during OAuth redirect.
      // localStorage is NOT used — it can be stale and cause wrong-role assignment.
      const pendingRole = searchParams.get('role') as 'parent' | 'sitter' | null;
      console.log('AuthCallback: pendingRole from URL:', pendingRole);

      // Clean up any stale localStorage value immediately
      localStorage.removeItem('pending_role');

      // --- Check existing DB roles (source of truth) ---
      const { data: dbRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      const roleSet = new Set(dbRoles?.map(r => r.role) || []);
      console.log('AuthCallback: existing DB roles:', Array.from(roleSet));

      // If user already has a role row — they're an existing user, just route them
      if (roleSet.has('sitter') || roleSet.has('parent')) {

        if (pendingRole && !roleSet.has(pendingRole)) {
          // Signed in via Google with a conflicting intended role
          const existingRole = roleSet.has('sitter') ? 'sitter' : 'parent';
          toast({
            title: "Account Already Exists",
            description: `This email is already registered as a ${existingRole}. You cannot use the same email for both roles.`,
            variant: "destructive",
          });
          await supabase.auth.signOut();
          navigate('/auth');
          return;
        }

        await routeExistingUser(userId, roleSet.has('sitter') ? 'sitter' : 'parent');
        return;
      }

      // --- New OAuth user: assign role via SECURITY DEFINER RPC ---
      // auth.uid() inside the RPC resolves to userId because the session is active.
      if (!pendingRole || (pendingRole !== 'parent' && pendingRole !== 'sitter')) {
        toast({
          title: "Please select a role",
          description: "Please choose whether you want to book a sitter or become a sitter.",
        });
        await supabase.auth.signOut();
        navigate('/auth');
        return;
      }

      setStatus(`Setting up your ${pendingRole} account...`);

      // assign_role_once is SECURITY DEFINER: it uses auth.uid() and enforces
      // one-role-per-user via the partial unique index, so it cannot be tricked
      // into assigning the wrong role even if the client sends bad data.
      const { data: assignResult, error: rpcError } = await supabase
        .rpc('assign_role_once' as any, { _intended_role: pendingRole });

      const resultObj = assignResult as { success?: boolean; role?: string; error?: string; code?: string } | null;

      if (rpcError || resultObj?.code === 'CONFLICTING_ROLE' || resultObj?.code === 'UNAUTHENTICATED') {
        const msg = resultObj?.error || rpcError?.message || 'Role assignment failed';
        console.error('AuthCallback: role assignment error:', msg);
        toast({ title: "Setup Failed", description: msg, variant: "destructive" });
        await supabase.auth.signOut();
        
        navigate('/auth');
        return;
      }

      if (!resultObj?.success) {
        console.error('AuthCallback: unexpected assign_role_once result:', assignResult);
        toast({ title: "Setup Failed", description: "Could not assign role. Please try again.", variant: "destructive" });
        await supabase.auth.signOut();
        
        navigate('/auth');
        return;
      }

      
      console.log('AuthCallback: role assigned:', pendingRole);

      await routeExistingUser(userId, pendingRole);

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

  /** Route a user whose role is confirmed in DB */
  const routeExistingUser = async (userId: string, role: string) => {
    if (role === 'sitter') {
      const { data: sitterData } = await supabase
        .from('sitters')
        .select('id, approved_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (!sitterData || !sitterData.approved_at) {
        navigate('/sitter-signup');
      } else {
        navigate('/sitter-dashboard');
      }
      return;
    }

    // Parent — check profile completeness
    setStatus("Loading your profile...");
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

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

    const { data: bookings } = await supabase
      .from('bookings')
      .select('status, payment_status')
      .eq('user_id', userId);

    const hasActive = bookings?.some(b =>
      b.status === 'pending' || b.status === 'confirmed' || b.payment_status === 'pending'
    );

    navigate(hasActive ? '/parent-dashboard?tab=bookings' : '/parent-dashboard?tab=book-sitter');
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
