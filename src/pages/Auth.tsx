import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Loader2, Baby, Briefcase } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { useSearchParams } from "react-router-dom";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Role + mode come exclusively from URL params — no localStorage fallback for role logic
  const roleParam = searchParams.get('role') as 'parent' | 'sitter' | null;
  const selectedRole = roleParam === 'parent' || roleParam === 'sitter' ? roleParam : null;

  const modeParam = searchParams.get('mode') as 'signup' | 'login' | null;
  const defaultTab = modeParam === 'login' ? 'login' : modeParam === 'signup' ? 'signup' : (selectedRole ? 'signup' : 'login');

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState({ email: "", password: "", confirmPassword: "" });

  const setRole = (role: 'parent' | 'sitter') => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('role', role);
    if (!newParams.get('mode')) newParams.set('mode', 'signup');
    setSearchParams(newParams, { replace: true });
  };

  // Redirect already-logged-in users away from this page
  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !selectedRole) return;

      // Use DB roles (not localStorage) for redirect decision
      const { data: dbRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id);

      const roles = new Set(dbRoles?.map(r => r.role) || []);

      if (selectedRole === 'sitter' && roles.has('sitter')) {
        window.location.href = '/sitter-dashboard';
      } else if (selectedRole === 'parent' && roles.has('parent')) {
        window.location.href = '/parent-dashboard?tab=book-sitter';
      }
    };
    checkExistingSession();
  }, [selectedRole]);

  // ── LOGIN ────────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) {
      setError("Please select whether you want to book a sitter or become a sitter.");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });
      if (error) throw error;

      if (data.user) {
        // Check role conflict using DB (server-side function) — never localStorage
        const { data: hasConflict } = await supabase.rpc('has_conflicting_role', {
          _user_id: data.user.id,
          _intended_role: selectedRole,
        });

        if (hasConflict) {
          const existingRole = selectedRole === 'sitter' ? 'parent' : 'sitter';
          setError(`This account is registered as a ${existingRole}. Please select "${existingRole === 'parent' ? 'Book a Sitter' : 'Become a Sitter'}" to log in.`);
          await supabase.auth.signOut();
          setIsLoading(false);
          return;
        }

        toast({ title: "Success!", description: "You have been logged in successfully." });

        // Redirect based on DB role — never localStorage
        if (selectedRole === 'sitter') {
          const { data: sitterData } = await supabase
            .from('sitters')
            .select('id')
            .eq('user_id', data.user.id)
            .maybeSingle();
          window.location.href = sitterData ? '/sitter-dashboard' : '/sitter-signup';
        } else {
          const { data: bookings } = await supabase
            .from('bookings')
            .select('status, payment_status')
            .eq('user_id', data.user.id)
            .order('created_at', { ascending: false });

          const hasActive = bookings?.some(b =>
            b.status === 'pending' || b.status === 'confirmed' || b.payment_status === 'pending'
          );
          window.location.href = hasActive
            ? '/parent-dashboard?tab=bookings'
            : '/parent-dashboard?tab=book-sitter';
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to log in');
    } finally {
      setIsLoading(false);
    }
  };

  // ── ATOMIC SIGNUP (email/password) ───────────────────────────────────────────
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) {
      setError("Please select whether you want to book a sitter or become a sitter.");
      return;
    }
    if (signupData.password !== signupData.confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (signupData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call server-side atomic signup — role is written server-side, never from localStorage.
      // x-internal-secret guards the email/password path; value comes from VITE_INTERNAL_SIGNUP_SECRET.
      const { data, error } = await supabase.functions.invoke('atomic-signup', {
        body: {
          email: signupData.email,
          password: signupData.password,
          intended_role: selectedRole, // exact value from URL param — never from localStorage
        },
        headers: {
          'x-internal-secret': import.meta.env.VITE_INTERNAL_SIGNUP_SECRET as string ?? '',
        },
      });

      if (error) throw error;
      if (data?.error) {
        if (data.code === 'EMAIL_EXISTS') {
          setError('An account with this email already exists. Please log in instead.');
        } else if (data.code === 'CONFLICTING_ROLE') {
          setError(data.error);
        } else {
          setError(data.error);
        }
        return;
      }

      toast({
        title: "Account created!",
        description: selectedRole === 'sitter'
          ? "Please check your email to verify your account before completing your sitter application."
          : "Please check your email to verify your account.",
      });

      window.location.href = `/verify-email?type=${selectedRole}&email=${encodeURIComponent(signupData.email)}`;
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  // ── GOOGLE OAUTH ─────────────────────────────────────────────────────────────
  const handleGoogleAuth = async () => {
    if (!selectedRole) {
      setError("Please select whether you want to book a sitter or become a sitter.");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      // Store pending_role in localStorage ONLY for UI display during OAuth redirect.
      // The AuthCallback will use this only to call the atomic-signup path server-side.
      localStorage.setItem('pending_role', selectedRole);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth-callback?role=${selectedRole}`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error('Google auth error:', err);
      setError(err.message || 'Failed to authenticate with Google');
      setIsLoading(false);
    }
  };

  const handleLoginInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData(prev => ({ ...prev, [name]: value }));
  };

  const handleSignupInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSignupData(prev => ({ ...prev, [name]: value }));
  };

  const GoogleIcon = () => (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-12">
        <div className="container mx-auto px-6">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to BabySit Club</h1>
              <p className="text-muted-foreground">
                {selectedRole
                  ? (selectedRole === 'sitter' ? 'Create your sitter account or sign in' : 'Create your account or sign in to book')
                  : 'Choose how you want to use BabySit Club'}
              </p>
            </div>

            {/* Role Selection — drives everything via URL */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => setRole('parent')}
                className={`p-4 rounded-lg border-2 transition-all touch-manipulation active:scale-[0.98] ${
                  selectedRole === 'parent'
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border bg-card hover:border-primary/50'
                }`}
              >
                <Baby className={`h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 ${selectedRole === 'parent' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="text-sm font-medium">Book a Sitter</div>
                <div className="text-xs text-muted-foreground">I need childcare</div>
              </button>

              <button
                type="button"
                onClick={() => setRole('sitter')}
                className={`p-4 rounded-lg border-2 transition-all touch-manipulation active:scale-[0.98] ${
                  selectedRole === 'sitter'
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border bg-card hover:border-primary/50'
                }`}
              >
                <Briefcase className={`h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 ${selectedRole === 'sitter' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="text-sm font-medium">Become a Sitter</div>
                <div className="text-xs text-muted-foreground">I want to earn</div>
              </button>
            </div>

            {!selectedRole && (
              <div className="text-center text-muted-foreground text-sm py-8">
                Please select a role above to continue.
              </div>
            )}

            {selectedRole && (
              <Card>
                <CardContent className="p-6">
                  <Tabs value={defaultTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger
                        value="login"
                        onClick={() => {
                          const p = new URLSearchParams(searchParams);
                          p.set('mode', 'login');
                          setSearchParams(p, { replace: true });
                        }}
                      >
                        Login
                      </TabsTrigger>
                      <TabsTrigger
                        value="signup"
                        onClick={() => {
                          const p = new URLSearchParams(searchParams);
                          p.set('mode', 'signup');
                          setSearchParams(p, { replace: true });
                        }}
                      >
                        Sign Up
                      </TabsTrigger>
                    </TabsList>

                    {error && (
                      <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    {/* LOGIN TAB */}
                    <TabsContent value="login">
                      <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="login-email">Email</Label>
                          <Input id="login-email" name="email" type="email" value={loginData.email} onChange={handleLoginInputChange} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="login-password">Password</Label>
                          <Input id="login-password" name="password" type="password" value={loginData.password} onChange={handleLoginInputChange} required />
                        </div>
                        <Button type="submit" className="w-full min-h-[48px] touch-manipulation" disabled={isLoading}>
                          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Sign In
                        </Button>
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center"><Separator className="w-full" /></div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                          </div>
                        </div>
                        <Button type="button" variant="outline" className="w-full min-h-[48px] touch-manipulation" disabled={isLoading} onClick={handleGoogleAuth}>
                          <GoogleIcon />
                          Continue with Google
                        </Button>
                      </form>
                    </TabsContent>

                    {/* SIGNUP TAB */}
                    <TabsContent value="signup">
                      <form onSubmit={handleSignup} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="signup-email">Email</Label>
                          <Input id="signup-email" name="email" type="email" value={signupData.email} onChange={handleSignupInputChange} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-password">Password</Label>
                          <Input id="signup-password" name="password" type="password" value={signupData.password} onChange={handleSignupInputChange} required minLength={6} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirm-password">Confirm Password</Label>
                          <Input id="confirm-password" name="confirmPassword" type="password" value={signupData.confirmPassword} onChange={handleSignupInputChange} required minLength={6} />
                        </div>
                        <Button type="submit" className="w-full min-h-[48px] touch-manipulation" disabled={isLoading}>
                          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Create Account
                        </Button>
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center"><Separator className="w-full" /></div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                          </div>
                        </div>
                        <Button type="button" variant="outline" className="w-full min-h-[48px] touch-manipulation" disabled={isLoading} onClick={handleGoogleAuth}>
                          <GoogleIcon />
                          Sign up with Google
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Auth;
