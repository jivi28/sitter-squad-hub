import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const VerifyEmail = () => {
  const [isResending, setIsResending] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Get the current user's email
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    getCurrentUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        // User has verified their email, redirect appropriately
        const urlParams = new URLSearchParams(window.location.search);
        const isParent = urlParams.get('type') === 'parent';
        
        if (isParent) {
          window.location.href = '/';
        } else {
          window.location.href = '/sitter-signup';
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleResendEmail = async () => {
    if (!userEmail) {
      toast({
        title: "Error",
        description: "No email address found. Please try signing up again.",
        variant: "destructive",
      });
      return;
    }

    setIsResending(true);

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const isParent = urlParams.get('type') === 'parent';
      const redirectUrl = isParent 
        ? `${window.location.origin}/verify-email?type=parent`
        : `${window.location.origin}/verify-email?type=sitter`;

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) throw error;

      toast({
        title: "Email sent!",
        description: "We've sent another verification email to your inbox.",
      });
    } catch (error: any) {
      console.error('Resend error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to resend verification email.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckVerification = async () => {
    setIsChecking(true);
    
    try {
      // Refresh the session to check if email is verified
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) throw error;
      
      if (session?.user.email_confirmed_at) {
        // Email is verified, redirect appropriately
        const urlParams = new URLSearchParams(window.location.search);
        const isParent = urlParams.get('type') === 'parent';
        
        toast({
          title: "Email verified!",
          description: "Your email has been verified successfully.",
        });
        
        setTimeout(() => {
          if (isParent) {
            window.location.href = '/';
          } else {
            window.location.href = '/sitter-signup';
          }
        }, 1000);
      } else {
        toast({
          title: "Not verified yet",
          description: "Please check your email and click the verification link first.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Check verification error:', error);
      toast({
        title: "Error",
        description: "Failed to check verification status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const urlParams = new URLSearchParams(window.location.search);
  const isParent = urlParams.get('type') === 'parent';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="py-12">
        <div className="container mx-auto px-6">
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Check Your Email</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center space-y-2">
                  <p className="text-muted-foreground">
                    We've sent a verification link to:
                  </p>
                  <p className="font-semibold text-foreground">
                    {userEmail || "your email address"}
                  </p>
                </div>

                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Click the link in your email to verify your account, then return here to continue{" "}
                    {isParent ? "browsing sitters" : "completing your sitter application"}.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <Button 
                    onClick={handleCheckVerification}
                    className="w-full"
                    disabled={isChecking}
                  >
                    {isChecking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    I've Verified My Email
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleResendEmail}
                    className="w-full"
                    disabled={isResending}
                  >
                    {isResending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Resend Verification Email
                  </Button>
                </div>

                <div className="text-center text-sm text-muted-foreground space-y-1">
                  <p>Didn't receive the email?</p>
                  <p>Check your spam folder or try resending.</p>
                </div>

                <div className="text-center">
                  <Button 
                    variant="ghost" 
                    onClick={() => window.location.href = isParent ? '/auth' : '/sitter-auth'}
                    className="text-sm"
                  >
                    Back to {isParent ? 'Login' : 'Sitter Login'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VerifyEmail;