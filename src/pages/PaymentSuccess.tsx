import { useEffect, useState, useRef } from "react";
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
  const [pollingCount, setPollingCount] = useState(0);
  const { toast } = useToast();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (bookingId) {
      checkPaymentStatus();
    } else {
      setError("No booking ID provided");
      setVerifying(false);
    }

    // Cleanup polling on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [bookingId]);

  // Phase 5.1 & 5.2: Query database directly and add polling for webhook delays
  const checkPaymentStatus = async () => {
    try {
      console.log('Checking payment status for booking:', bookingId);
      
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('payment_status, status, total_cost')
        .eq('id', bookingId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch booking: ${fetchError.message}`);
      }

      console.log('Booking payment status:', booking?.payment_status);

      if (booking?.payment_status === 'completed' || booking?.payment_status === 'paid') {
        // Payment confirmed by webhook
        setVerified(true);
        setVerifying(false);
        
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }

        toast({
          title: "Payment Verified!",
          description: "Your booking payment has been confirmed.",
        });
      } else if (booking?.payment_status === 'pending') {
        // Phase 5.2: Webhook hasn't updated yet - start/continue polling
        if (pollingCount === 0) {
          console.log('Payment still pending, starting polling...');
          setPollingCount(1);
          
          // Poll every 2 seconds for up to 30 seconds (15 attempts)
          let attempts = 0;
          pollingIntervalRef.current = setInterval(async () => {
            attempts++;
            setPollingCount(attempts);
            
            console.log(`Polling attempt ${attempts}/15`);
            
            const { data: updatedBooking } = await supabase
              .from('bookings')
              .select('payment_status')
              .eq('id', bookingId)
              .single();

            if (updatedBooking?.payment_status === 'completed' || updatedBooking?.payment_status === 'paid') {
              console.log('Payment confirmed during polling');
              setVerified(true);
              setVerifying(false);
              
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
              }

              toast({
                title: "Payment Verified!",
                description: "Your booking payment has been confirmed.",
              });
            } else if (attempts >= 15) {
              // 30 seconds passed, stop polling
              console.warn('Polling timeout - payment still pending after 30 seconds');
              setError("Payment is processing. Please check your bookings in a few minutes.");
              setVerifying(false);
              
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
              }

              toast({
                title: "Payment Processing",
                description: "Your payment is being processed. Check your bookings shortly.",
                variant: "default",
              });
            }
          }, 2000); // Poll every 2 seconds
        }
      } else {
        // Payment failed or other status
        setError(`Payment status: ${booking?.payment_status || 'unknown'}`);
        setVerifying(false);
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      setError(error instanceof Error ? error.message : "Failed to verify payment");
      setVerifying(false);
      
      toast({
        title: "Verification Error", 
        description: "There was an issue verifying your payment. Please contact support.",
        variant: "destructive",
      });
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
                  <CardTitle>
                    {pollingCount > 0 ? "Processing Payment..." : "Verifying Payment..."}
                  </CardTitle>
                  <CardDescription>
                    {pollingCount > 0 
                      ? `Waiting for payment confirmation... (${pollingCount * 2}s)`
                      : "Please wait while we confirm your payment"}
                  </CardDescription>
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
                    <Button variant="outline" onClick={checkPaymentStatus} disabled={verifying}>
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