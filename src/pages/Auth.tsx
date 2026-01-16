import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Loader2, Baby, Briefcase } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { useNavigate, useSearchParams } from "react-router-dom";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Determine role from URL parameter or default to 'parent'
  const [selectedRole, setSelectedRole] = useState<'parent' | 'sitter'>(
    (searchParams.get('role') as 'parent' | 'sitter') || 'parent'
  );

  // Login form state
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });

  // Signup form state
  const [signupData, setSignupData] = useState({
    email: "",
    password: "",
    confirmPassword: ""
  });

  const getSmartRedirect = async (userId: string): Promise<string> => {
    // Store role in localStorage for future reference
    localStorage.setItem('user_role', selectedRole);
    
    if (selectedRole === 'sitter') {
      // Check if sitter has completed profile
      const { data: sitterData } = await supabase
        .from('sitters')
        .select('id, status')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (!sitterData) {
        return '/sitter-signup';
      }
      return '/sitter-dashboard';
    }
    
    // Parent role logic
    try {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bookings:', error);
        return '/parent-dashboard?tab=book-sitter';
      }

      if (!bookings || bookings.length === 0) {
        return '/parent-dashboard?tab=book-sitter';
      }

      const hasActiveBookings = bookings.some(booking => 
        booking.status === 'pending' || 
        booking.status === 'confirmed' || 
        booking.payment_status === 'pending'
      );

      if (hasActiveBookings) {
        return '/parent-dashboard?tab=bookings';
      }

      return '/parent-dashboard?tab=book-sitter';
    } catch (error) {
      console.error('Error in smart redirect:', error);
      return '/parent-dashboard?tab=book-sitter';
    }
  };

  // Check if user is already logged in
  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const redirectUrl = await getSmartRedirect(session.user.id);
        window.location.href = redirectUrl;
      }
    };
    
    checkExistingSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (error) throw error;

      if (data.user) {
        toast({
          title: "Success!",
          description: "You have been logged in successfully.",
        });
        
        // Get smart redirect based on user's booking status
        const redirectUrl = await getSmartRedirect(data.user.id);
        window.location.href = redirectUrl;
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Failed to log in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (signupData.password !== signupData.confirmPassword) {
      setError("Passwords don't match");
      setIsLoading(false);
      return;
    }

    if (signupData.password.length < 6) {
      setError("Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }

    try {
      const email = signupData.email;
      // Persist email for verify page
      try { localStorage.setItem('pending_signup_email', email); } catch {}
      // Use role-specific redirect URL
      const redirectUrl = `${window.location.origin}/verify-email?type=${selectedRole}&email=${encodeURIComponent(email)}`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password: signupData.password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) throw error;

      if (data.user) {
        toast({
          title: "Account created!",
          description: selectedRole === 'sitter' 
            ? "Please check your email to verify your account before completing your sitter application."
            : "Please check your email to verify your account before booking sitters. You can start browsing available sitters now!",
        });
        // Redirect to email verification page with correct role
        window.location.href = `/verify-email?type=${selectedRole}&email=${encodeURIComponent(signupData.email)}`;
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      if (error.message.includes('already registered')) {
        setError('An account with this email already exists. Please try logging in instead.');
      } else {
        setError(error.message || 'Failed to create account');
      }
    } finally {
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

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Store role preference before OAuth redirect
      localStorage.setItem('pending_role', selectedRole);
      
      // Redirect to auth callback handler instead of directly to signup
      const redirectPath = '/auth-callback';
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${redirectPath}?role=${selectedRole}`
        }
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Google auth error:', error);
      setError(error.message || 'Failed to authenticate with Google');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="py-12">
        <div className="container mx-auto px-6">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Welcome to BabySit Club
              </h1>
              <p className="text-muted-foreground">
                Sign in to your account or create a new one
              </p>
            </div>

            {/* Role Selection - Mobile optimized with larger touch targets */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => setSelectedRole('parent')}
                className={`p-4 sm:p-4 rounded-lg border-2 transition-all touch-manipulation active:scale-[0.98] ${
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
                onClick={() => setSelectedRole('sitter')}
                className={`p-4 sm:p-4 rounded-lg border-2 transition-all touch-manipulation active:scale-[0.98] ${
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

            <Card>
              <CardContent className="p-6">
                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  </TabsList>

                  {error && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <TabsContent value="login">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">Email</Label>
                        <Input
                          id="login-email"
                          name="email"
                          type="email"
                          value={loginData.email}
                          onChange={handleLoginInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">Password</Label>
                        <Input
                          id="login-password"
                          name="password"
                          type="password"
                          value={loginData.password}
                          onChange={handleLoginInputChange}
                          required
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full min-h-[48px] touch-manipulation" 
                        disabled={isLoading}
                      >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sign In
                      </Button>
                      
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <Separator className="w-full" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">
                            Or continue with
                          </span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full min-h-[48px] touch-manipulation"
                        disabled={isLoading}
                        onClick={handleGoogleAuth}
                      >
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                          <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                          />
                          <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                          />
                          <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                          />
                          <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                          />
                        </svg>
                        Continue with Google
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup">
                    <form onSubmit={handleSignup} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <Input
                          id="signup-email"
                          name="email"
                          type="email"
                          value={signupData.email}
                          onChange={handleSignupInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <Input
                          id="signup-password"
                          name="password"
                          type="password"
                          value={signupData.password}
                          onChange={handleSignupInputChange}
                          required
                          minLength={6}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input
                          id="confirm-password"
                          name="confirmPassword"
                          type="password"
                          value={signupData.confirmPassword}
                          onChange={handleSignupInputChange}
                          required
                          minLength={6}
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full min-h-[48px] touch-manipulation" 
                        disabled={isLoading}
                      >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Account
                      </Button>
                      
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <Separator className="w-full" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">
                            Or continue with
                          </span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full min-h-[48px] touch-manipulation"
                        disabled={isLoading}
                        onClick={handleGoogleAuth}
                      >
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                          <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                          />
                          <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                          />
                          <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                          />
                          <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                          />
                        </svg>
                        Sign up with Google
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Auth;