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

  const handleAuthComplete = async (userId: string, accessToken: string) => {
    try {
      setStatus("Checking your account...");

      // Role comes from URL param (set during OAuth redirect) or localStorage (fallback for display only)
      // We treat this as the user's explicit intention — but we VERIFY against DB before writing.
      const pendingRole = (searchParams.get('role') || localStorage.getItem('pending_role')) as 'parent' | 'sitter' | null;
      console.log('AuthCallback: pendingRole:', pendingRole);

      // --- Check existing DB roles (source of truth) ---
      const { data: dbRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      const roleSet = new Set(dbRoles?.map(r => r.role) || []);
      console.log('AuthCallback: existing DB roles:', Array.from(roleSet));

      // If user already has a role row — they're an existing user, just route them
      if (roleSet.has('sitter') || roleSet.has('parent')) {
        localStorage.removeItem('pending_role');

        if (pendingRole && !roleSet.has(pendingRole)) {
          // They signed in via Google with a conflicting role
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

      // --- New OAuth user: we must assign a role server-side ---
      if (!pendingRole || (pendingRole !== 'parent' && pendingRole !== 'sitter')) {
        // No role known — can't safely assign — send them to choose
        toast({
          title: "Please select a role",
          description: "Please choose whether you want to book a sitter or become a sitter.",
        });
        await supabase.auth.signOut();
        navigate('/auth');
        return;
      }

      setStatus(`Setting up your ${pendingRole} account...`);

      // Write the user_roles row server-side using the service-role edge function
      // We pass the access token so the edge function can verify identity
      const { data: assignData, error: assignError } = await supabase.functions.invoke('atomic-signup', {
        body: {
          oauth_user_id: userId,           // existing auth user from OAuth
          intended_role: pendingRole,
          is_oauth: true,                  // tells the function to skip auth.admin.createUser
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (assignError || assignData?.error) {
        const msg = assignData?.error || assignError?.message || 'Role assignment failed';
        console.error('AuthCallback: role assignment error:', msg);
        toast({ title: "Setup Failed", description: msg, variant: "destructive" });
        await supabase.auth.signOut();
        localStorage.removeItem('pending_role');
        navigate('/auth');
        return;
      }

      localStorage.removeItem('pending_role');
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
