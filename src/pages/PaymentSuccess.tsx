import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("booking_id");
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (bookingId) {
      verifyPayment();
    } else {
      setError("No booking ID provided");
      setVerifying(false);
    }
  }, [bookingId]);

  const verifyPayment = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-booking-payment', {
        body: { booking_id: bookingId }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        setVerified(true);
        toast({
          title: "Payment Verified!",
          description: "Your booking payment has been confirmed.",
        });
      } else {
        setError(data.message || "Payment verification failed");
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      setError(error.message || "Failed to verify payment");
      toast({
        title: "Verification Error", 
        description: "There was an issue verifying your payment. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              {verifying ? (
                <>
                  <Loader2 className="h-16 w-16 animate-spin mx-auto mb-4 text-primary" />
                  <CardTitle>Verifying Payment...</CardTitle>
                  <CardDescription>Please wait while we confirm your payment</CardDescription>
                </>
              ) : verified ? (
                <>
                  <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
                  <CardTitle className="text-green-700">Payment Successful!</CardTitle>
                  <CardDescription>Your booking has been confirmed and paid</CardDescription>
                </>
              ) : (
                <>
                  <AlertCircle className="h-16 w-16 mx-auto mb-4 text-orange-500" />
                  <CardTitle className="text-orange-700">Payment Issues</CardTitle>
                  <CardDescription>{error}</CardDescription>
                </>
              )}
            </CardHeader>
            <CardContent className="text-center">
              {verified && (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Your babysitting service has been confirmed. You should receive a confirmation email shortly.
                  </p>
                  <div className="space-y-2">
                    <Button asChild className="w-full">
                      <Link to="/parent-dashboard">View My Bookings</Link>
                    </Button>
                    <Button variant="outline" asChild className="w-full">
                      <Link to="/">Return Home</Link>
                    </Button>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    If you believe this is an error, please contact our support team with your booking ID: <strong>{bookingId}</strong>
                  </p>
                  <div className="space-y-2">
                    <Button asChild className="w-full">
                      <Link to="/parent-dashboard">Check My Bookings</Link>
                    </Button>
                    <Button variant="outline" onClick={verifyPayment} disabled={verifying}>
                      Try Again
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;