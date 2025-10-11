import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VerificationBannerProps {
  userEmail: string;
}

const VerificationBanner = ({ userEmail }: VerificationBannerProps) => {
  const [isResending, setIsResending] = useState(false);
  const [lastSent, setLastSent] = useState<number | null>(null);
  const { toast } = useToast();

  const handleResendEmail = async () => {
    // Prevent spam - require 60 second cooldown
    const now = Date.now();
    if (lastSent && now - lastSent < 60000) {
      const remainingSeconds = Math.ceil((60000 - (now - lastSent)) / 1000);
      toast({
        title: "Please wait",
        description: `You can resend in ${remainingSeconds} seconds`,
        variant: "default",
      });
      return;
    }

    setIsResending(true);
    try {
      const redirectUrl = `${window.location.origin}/verify-email?type=parent&email=${encodeURIComponent(userEmail)}`;
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) throw error;

      setLastSent(Date.now());
      toast({
        title: "Verification email sent!",
        description: "Please check your inbox and spam folder.",
      });
    } catch (error: any) {
      console.error('Resend error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to resend verification email",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950">
      <Mail className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            Please verify your email address
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-200 mt-1">
            Check your inbox for a verification link. You can browse sitters now, but you'll need to verify before booking.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleResendEmail}
          disabled={isResending}
          className="ml-4 whitespace-nowrap"
        >
          {isResending ? (
            <>
              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Mail className="h-3 w-3 mr-2" />
              Resend Email
            </>
          )}
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default VerificationBanner;