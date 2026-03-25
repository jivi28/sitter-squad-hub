import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useBookingUpdates } from "@/hooks/useBookingUpdates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, Clock, User, DollarSign, RefreshCw, Heart, CreditCard, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SitterContactInfo } from "./SitterContactInfo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveDateInput } from "@/components/ui/responsive-date-input";
import { ResponsiveTimeInput } from "@/components/ui/responsive-time-input";
import { RequestExpirationTimer } from "./RequestExpirationTimer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BookingStatusStepper } from "./BookingStatusStepper";
import { CollapsibleApplications } from "./CollapsibleApplications";
import { EmptyState } from "./EmptyState";
import { useNavigate } from "react-router-dom";
import { ExtendRequestButton } from "./ExtendRequestButton";

interface Booking {
  id: string;
  user_id: string;
  sitter_id: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  sitter_hourly_rate: number;
  num_children: number;
  total_cost: number;
  status: string;
  payment_status: string;
  special_notes?: string;
  preferred_language?: string;
  created_at: string;
  request_expires_at?: string;
  response_count?: number;
  extension_count?: number;
  sitters?: {
    first_name: string;
    last_name: string;
  };
}

interface RebookData {
  booking_date: string;
  start_time: string;
  end_time: string;
  special_notes: string;
}

const ParentBookingHistory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Use real-time booking updates hook - use bookings directly, no local state needed
  const { bookings, loading, refetch: fetchBookings } = useBookingUpdates({
    userId: user?.id || '',
    userRole: 'parent'
  });
  
  const [rebookData, setRebookData] = useState<RebookData>({
    booking_date: "",
    start_time: "",
    end_time: "",
    special_notes: ""
  });
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [rebooking, setRebooking] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null);

  // Extension handling
  const handleExtendRequest = async (bookingId: string, currentExtensionCount: number) => {
    if (currentExtensionCount >= 2) {
      toast({
        title: "Extension Limit Reached",
        description: "You can only extend a request twice. Please create a new booking request.",
        variant: "destructive",
      });
      return;
    }

    try {
      const newExpiryDate = new Date();
      newExpiryDate.setHours(newExpiryDate.getHours() + 12);

      const { error } = await supabase
        .from('bookings')
        .update({
          request_expires_at: newExpiryDate.toISOString(),
          extension_count: currentExtensionCount + 1,
        })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Request Extended",
        description: "Your booking request has been extended by 12 hours.",
      });

      fetchBookings();
    } catch (error) {
      console.error("Error extending request:", error);
      toast({
        title: "Error",
        description: "Failed to extend request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "default";
      case "pending":
        return "secondary";
      case "received_responses":
        return "outline";
      case "completed":
        return "outline";
      case "cancelled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "pending":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const canRebook = (booking: Booking) => {
    return booking.status === "completed" && booking.sitter_id && booking.sitters;
  };

  const handleRebook = async () => {
    if (!selectedBooking || !user) return;

    try {
      setRebooking(true);

      // Calculate total cost (estimate, will be updated when sitter accepts)
      const startTime = new Date(`2000-01-01T${rebookData.start_time}`);
      const endTime = new Date(`2000-01-01T${rebookData.end_time}`);
      const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      const estimatedCost = hours * selectedBooking.sitter_hourly_rate;

      // Set request expiration to 24 hours from now
      const requestExpiresAt = new Date();
      requestExpiresAt.setHours(requestExpiresAt.getHours() + 24);

      const { error } = await supabase.from("bookings").insert({
        user_id: user.id,
        booking_date: rebookData.booking_date,
        start_time: rebookData.start_time,
        end_time: rebookData.end_time,
        num_children: selectedBooking.num_children,
        preferred_language: selectedBooking.preferred_language,
        special_notes: rebookData.special_notes,
        total_cost: estimatedCost,
        status: "pending",
        payment_status: "pending",
        request_expires_at: requestExpiresAt.toISOString(),
      });

      if (error) {
        throw error;
      }

      const sitterName = selectedBooking.sitters 
        ? `${selectedBooking.sitters.first_name} ${selectedBooking.sitters.last_name}`
        : 'your sitter';

      toast({
        title: "Rebook Request Sent!",
        description: `Your request has been sent to ${sitterName}. You'll be notified when they respond.`,
      });

      // Reset form and close dialog
      setRebookData({
        booking_date: "",
        start_time: "",
        end_time: "",
        special_notes: ""
      });
      setSelectedBooking(null);
      
      // Refresh bookings to show the new request
      fetchBookings();
    } catch (error) {
      console.error("Error creating rebook request:", error);
      toast({
        title: "Error",
        description: "Failed to send rebook request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRebooking(false);
    }
  };

  const addToFavorites = async (booking: Booking) => {
    if (!user || !booking.sitter_id) return;

    try {
      const { error } = await supabase.from("favorite_sitters").insert({
        user_id: user.id,
        sitter_id: booking.sitter_id,
      });

      if (error) {
        if (error.code === '23505') { // unique constraint violation
          const sitterName = booking.sitters 
            ? `${booking.sitters.first_name} ${booking.sitters.last_name}`
            : 'This sitter';
          toast({
            title: "Already Added",
            description: `${sitterName} is already in your favorites.`,
          });
        } else {
          throw error;
        }
      } else {
        const sitterName = booking.sitters 
          ? `${booking.sitters.first_name} ${booking.sitters.last_name}`
          : 'Sitter';
        toast({
          title: "Added to Favorites",
          description: `${sitterName} has been added to your favorite sitters.`,
        });
      }
    } catch (error) {
      console.error("Error adding to favorites:", error);
      toast({
        title: "Error",
        description: "Failed to add sitter to favorites. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePayment = async (booking: Booking) => {
    if (!user) return;
    
    try {
      setPaymentLoading(booking.id);
      
      toast({
        title: "Redirecting to Payment",
        description: "Please wait while we prepare your secure payment...",
      });
      
      const { data, error } = await supabase.functions.invoke('create-booking-payment', {
        body: { booking_id: booking.id }
      });

      if (error) {
        throw error;
      }

      if (data.url) {
        // Redirect to payment in same window for better UX
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Error",
        description: "Failed to start payment process. Please try again.",
        variant: "destructive",
      });
      setPaymentLoading(null);
    }
  };

  const canPay = (booking: Booking) => {
    return booking.status === "confirmed" && booking.payment_status === "pending";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }


  if (bookings.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="No Bookings Yet"
        description="Start your journey by booking a trusted sitter for your family."
        tips={[
          "Click 'Book a Sitter' to create your first booking request",
          "Fill in your requirements and available sitters will apply",
          "You can review sitter profiles before confirming",
          "Payment is secure and only processed after confirmation"
        ]}
        actionLabel="Book Your First Sitter"
        onAction={() => navigate("/parent-dashboard?tab=book-sitter")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Bookings</h2>
        <Button variant="outline" size="sm" onClick={fetchBookings}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {bookings.map((booking) => (
          <Card key={booking.id}>
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {booking.status === "cancelled"
                    ? "Cancelled Request"
                    : booking.sitters 
                      ? `${booking.sitters.first_name} ${booking.sitters.last_name}`
                      : "Waiting for Sitter"}
                </CardTitle>
                {booking.status !== "cancelled" && (
                  <RequestExpirationTimer 
                    expiresAt={booking.request_expires_at || null}
                    status={booking.status}
                  />
                )}
              </div>
              <CardDescription className="mb-4">
                Booking created on {new Date(booking.created_at).toLocaleDateString()}
              </CardDescription>
              <BookingStatusStepper
                status={booking.status}
                paymentStatus={booking.payment_status}
                responseCount={booking.response_count}
              />
            </CardHeader>
            <CardContent>
              {booking.status === "pending" && booking.request_expires_at && (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This booking request will expire in <RequestExpirationTimer expiresAt={booking.request_expires_at} status={booking.status} />. 
                    {" "}After expiration, you'll need to create a new request.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(booking.booking_date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{booking.num_children} children</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>€{booking.total_cost}</span>
                </div>
              </div>

              {booking.special_notes && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    <strong>Notes:</strong> {booking.special_notes}
                  </p>
                </div>
              )}

              {booking.preferred_language && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    <strong>Preferred Language:</strong> {booking.preferred_language}
                  </p>
                </div>
              )}

              {/* Show sitter contact info only for confirmed AND paid bookings */}
              {booking.status === "confirmed" && booking.sitter_id && booking.sitters && (
                <SitterContactInfo 
                  sitterId={booking.sitter_id}
                  sitterName={`${booking.sitters.first_name} ${booking.sitters.last_name}`}
                  bookingStatus={booking.status}
                  paymentStatus={booking.payment_status}
                />
              )}

              {/* Show applications when there are responses (pending or received_responses status) */}
              {(booking.status === "pending" || booking.status === "received_responses") && 
               booking.response_count && booking.response_count > 0 && (
                <div className="mt-4">
                  <Alert className="mb-4 border-primary bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-primary font-medium">
                      Great news! {booking.response_count} sitter(s) have applied to your request. Review and select below!
                    </AlertDescription>
                  </Alert>
                  <CollapsibleApplications
                    bookingId={booking.id}
                    responseCount={booking.response_count}
                    onSitterSelected={() => {
                      // Refresh bookings after sitter selection
                      fetchBookings();
                    }}
                    defaultExpanded={true}
                  />
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                {canPay(booking) && (
                  <div className="w-full">
                    <Button
                      onClick={() => handlePayment(booking)}
                      disabled={paymentLoading === booking.id}
                      className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                    >
                      {paymentLoading === booking.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4 mr-2" />
                      )}
                      Pay €{booking.total_cost}
                    </Button>
                    <p className="text-sm text-muted-foreground mt-2">
                      You'll be redirected to a secure payment page. After payment, you'll be returned here.
                    </p>
                  </div>
                )}
                
                {canRebook(booking) && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedBooking(booking)}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Rebook This Sitter
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          Rebook {booking.sitters 
                            ? `${booking.sitters.first_name} ${booking.sitters.last_name}`
                            : 'Sitter'}
                        </DialogTitle>
                        <DialogDescription>
                          Send a new booking request to your previous sitter.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <ResponsiveDateInput
                              value={rebookData.booking_date}
                              onChange={(value) => setRebookData(prev => ({
                                ...prev,
                                booking_date: value
                              }))}
                              label="Date"
                              id="booking_date"
                              min={new Date().toISOString().split('T')[0]}
                              required
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ResponsiveTimeInput 
                              value={rebookData.start_time}
                              onChange={(value) => setRebookData(prev => ({
                                ...prev,
                                start_time: value
                              }))}
                              label="Start Time"
                              required
                            />
                            <ResponsiveTimeInput 
                              value={rebookData.end_time}
                              onChange={(value) => setRebookData(prev => ({
                                ...prev,
                                end_time: value
                              }))}
                              label="End Time"
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="special_notes">Special Notes</Label>
                          <Textarea
                            id="special_notes"
                            placeholder="Any special instructions or requests..."
                            value={rebookData.special_notes}
                            onChange={(e) => setRebookData(prev => ({
                              ...prev,
                              special_notes: e.target.value
                            }))}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setSelectedBooking(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleRebook}
                            disabled={
                              rebooking ||
                              !rebookData.booking_date ||
                              !rebookData.start_time ||
                              !rebookData.end_time
                            }
                          >
                            {rebooking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Send Rebook Request
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                 )}
                 
                 {booking.status === "pending" && booking.request_expires_at && (
                   <ExtendRequestButton
                     bookingId={booking.id}
                     extensionCount={booking.extension_count || 0}
                     onExtend={handleExtendRequest}
                   />
                 )}
                 
                 {booking.sitter_id && booking.status === "completed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addToFavorites(booking)}
                  >
                    <Heart className="h-4 w-4 mr-2" />
                    Add to Favorites
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ParentBookingHistory;