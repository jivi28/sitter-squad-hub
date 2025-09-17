import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Users, Loader2, Languages, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface BookingRequest {
  date: string;
  startTime: string;
  endTime: string;
  children: number;
  notes: string;
  preferredLanguage: string;
}

const RequestBasedBookingSystem = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [request, setRequest] = useState<BookingRequest>({
    date: "",
    startTime: "",
    endTime: "",
    children: 1,
    notes: "",
    preferredLanguage: ""
  });

  const calculateHours = () => {
    if (!request.startTime || !request.endTime) return 0;
    const start = new Date(`1970-01-01T${request.startTime}`);
    const end = new Date(`1970-01-01T${request.endTime}`);
    const diffMs = end.getTime() - start.getTime();
    return Math.max(0, diffMs / (1000 * 60 * 60));
  };

  const isRequestComplete = () => {
    return request.date && 
           request.startTime && 
           request.endTime && 
           request.children > 0;
  };

  const updateRequest = (field: keyof BookingRequest, value: string | number) => {
    setRequest(prev => ({ ...prev, [field]: value }));
  };

  const submitRequest = async () => {
    if (!user || !isRequestComplete()) {
      toast({
        title: "Request incomplete",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Set request expiration to 24 hours from now
      const requestExpiresAt = new Date();
      requestExpiresAt.setHours(requestExpiresAt.getHours() + 24);

      // Create the booking request (no sitter assigned yet)
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          booking_date: request.date,
          start_time: request.startTime,
          end_time: request.endTime,
          num_children: request.children,
          special_notes: request.notes || null,
          preferred_language: request.preferredLanguage || null,
          total_cost: 0, // Will be calculated when sitter accepts
          status: 'pending',
          payment_status: 'pending',
          request_expires_at: requestExpiresAt.toISOString(),
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // TODO: Call edge function to notify available sitters
      // For now, we'll show success message
      
      toast({
        title: "Request Submitted!",
        description: `Your babysitting request has been sent to available sitters. You'll be notified when a sitter accepts your request.`,
      });

      // Reset form
      setRequest({
        date: "",
        startTime: "",
        endTime: "",
        children: 1,
        notes: "",
        preferredLanguage: ""
      });

    } catch (error: any) {
      console.error('Request submission error:', error);
      toast({
        title: "Request failed",
        description: error.message || "There was an error submitting your request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const estimatedHours = calculateHours();
  const canSubmit = isRequestComplete() && !isSubmitting;

  return (
    <section id="booking-system" className="py-20 bg-gradient-soft">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Request a Sitter
          </h2>
          <p className="text-xl text-muted-foreground">
            Submit your request and available sitters will respond to you
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Booking Request Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input 
                    type="date" 
                    id="date" 
                    value={request.date}
                    onChange={(e) => updateRequest("date", e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="children">Number of Children *</Label>
                  <Input 
                    type="number" 
                    id="children" 
                    min="1" 
                    max="5" 
                    value={request.children}
                    onChange={(e) => updateRequest("children", parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time *</Label>
                  <Input 
                    type="time" 
                    id="start-time" 
                    value={request.startTime}
                    onChange={(e) => updateRequest("startTime", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time *</Label>
                  <Input 
                    type="time" 
                    id="end-time" 
                    value={request.endTime}
                    onChange={(e) => updateRequest("endTime", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language" className="flex items-center space-x-2">
                  <Languages className="w-4 h-4" />
                  <span>Preferred Language (Optional)</span>
                </Label>
                <Select 
                  value={request.preferredLanguage} 
                  onValueChange={(value) => updateRequest("preferredLanguage", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No preference</SelectItem>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Spanish">Spanish</SelectItem>
                    <SelectItem value="French">French</SelectItem>
                    <SelectItem value="German">German</SelectItem>
                    <SelectItem value="Italian">Italian</SelectItem>
                    <SelectItem value="Portuguese">Portuguese</SelectItem>
                    <SelectItem value="Mandarin">Mandarin</SelectItem>
                    <SelectItem value="Japanese">Japanese</SelectItem>
                    <SelectItem value="Korean">Korean</SelectItem>
                    <SelectItem value="Arabic">Arabic</SelectItem>
                    <SelectItem value="Hindi">Hindi</SelectItem>
                    <SelectItem value="Russian">Russian</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Special Notes or Requirements (Optional)</Label>
                <Textarea 
                  id="notes" 
                  placeholder="Any special instructions, requirements, or information about your children..."
                  value={request.notes}
                  onChange={(e) => updateRequest("notes", e.target.value)}
                  rows={4}
                />
              </div>

              {estimatedHours > 0 && (
                <div className="bg-accent/50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Estimated Duration:</span>
                    </div>
                    <span className="text-lg font-bold text-primary">
                      {estimatedHours.toFixed(1)} hours
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Final cost will depend on the sitter's hourly rate
                  </p>
                </div>
              )}

              <div className="pt-4">
                <Button 
                  onClick={submitRequest}
                  disabled={!canSubmit}
                  size="lg"
                  className="w-full"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting Request...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Request to Sitters
                    </>
                  )}
                </Button>
                {!isRequestComplete() && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Please fill in all required fields (*)
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 text-center">
            <h3 className="text-lg font-semibold mb-4">How it works:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-xl mb-2">
                  1
                </div>
                <h4 className="font-medium mb-2">Submit Request</h4>
                <p className="text-sm text-muted-foreground">
                  Fill out your babysitting needs and submit your request
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-xl mb-2">
                  2
                </div>
                <h4 className="font-medium mb-2">Sitters Respond</h4>
                <p className="text-sm text-muted-foreground">
                  Available sitters will review and respond to your request
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-xl mb-2">
                  3
                </div>
                <h4 className="font-medium mb-2">Confirm & Pay</h4>
                <p className="text-sm text-muted-foreground">
                  Accept a sitter and complete payment to confirm your booking
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RequestBasedBookingSystem;