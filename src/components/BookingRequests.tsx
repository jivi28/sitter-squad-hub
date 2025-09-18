import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, DollarSign, MapPin, Loader2, Languages, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface BookingRequest {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  num_children: number;
  total_cost: number;
  status: string;
  special_notes: string | null;
  preferred_language: string | null;
  user_id: string;
  request_expires_at: string | null;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    phone: string;
    address: string;
    children_ages: string;
    emergency_contact: string | null;
    special_needs: string | null;
  };
}

interface Sitter {
  id: string;
  hourly_rate: number;
  first_name: string;
  last_name: string;
}

const BookingRequests = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [sitter, setSitter] = useState<Sitter | null>(null);

  useEffect(() => {
    fetchBookingRequests();
  }, []);

  const fetchBookingRequests = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user');
        return;
      }

      // Get sitter information
      const { data: sitterData, error: sitterError } = await supabase
        .from('sitters')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (sitterError || !sitterData) {
        console.error('Sitter not found:', sitterError);
        return;
      }

      setSitter(sitterData);

      // Fetch matching pending booking requests from Edge Function (handles RLS securely)
      const { data: requestsData, error: requestsError } = await supabase
        .functions
        .invoke('fetch-available-requests');

      if (requestsError) {
        throw requestsError;
      }

      setRequests(requestsData?.requests || []);
    } catch (error) {
      console.error('Error fetching booking requests:', error);
      toast({
        title: "Error",
        description: "Failed to load booking requests. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (requestId: string, response: 'accepted' | 'declined') => {
    if (!sitter) return;

    try {
      setResponding(requestId);

      const { data, error } = await supabase.functions.invoke('respond-to-booking', {
        body: {
          booking_id: requestId,
          response,
          message: responseMessage || undefined
        }
      });

      if (error) throw error;

      toast({
        title: response === 'accepted' ? "Request Accepted!" : "Request Declined",
        description: data.message,
      });

      // Refresh the requests list
      await fetchBookingRequests();
      setResponseMessage("");
    } catch (error: any) {
      console.error('Error responding to booking:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to respond to booking request.",
        variant: "destructive",
      });
    } finally {
      setResponding(null);
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

  const calculateHours = (startTime: string, endTime: string) => {
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  };

  const calculateCost = (startTime: string, endTime: string) => {
    if (!sitter) return 0;
    const hours = calculateHours(startTime, endTime);
    return hours * sitter.hourly_rate;
  };

  const getTimeUntilExpiry = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffHours = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return "Expires soon";
    if (diffHours === 1) return "1 hour left";
    return `${diffHours} hours left`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No New Requests</h3>
          <p className="text-muted-foreground">
            New booking requests that match your availability will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Booking Requests</h2>
        <Badge variant="secondary">{requests.length} pending</Badge>
      </div>

      <div className="grid gap-4">
        {requests.map((request) => (
          <Card key={request.id} className="border-2 border-primary/20 bg-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {request.profiles ? 
                    `${request.profiles.first_name} ${request.profiles.last_name}` : 
                    "Parent"
                  }
                </CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline">
                    {request.request_expires_at && getTimeUntilExpiry(request.request_expires_at)}
                  </Badge>
                  <Badge variant="secondary">New Request</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(request.booking_date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {formatTime(request.start_time)} - {formatTime(request.end_time)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{request.num_children} children</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">
                    ${calculateCost(request.start_time, request.end_time).toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({calculateHours(request.start_time, request.end_time).toFixed(1)}h)
                  </span>
                </div>
              </div>

              {request.profiles && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-3 bg-accent/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      <strong>Phone:</strong> {request.profiles.phone}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Address:</strong> {request.profiles.address}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      <strong>Children Ages:</strong> {request.profiles.children_ages}
                    </p>
                    {request.profiles.emergency_contact && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Emergency Contact:</strong> {request.profiles.emergency_contact}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {request.special_notes && (
                <div className="mb-4 p-3 bg-accent/30 rounded-lg">
                  <p className="text-sm">
                    <strong>Special Notes:</strong> {request.special_notes}
                  </p>
                </div>
              )}

              {request.preferred_language && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Languages className="h-4 w-4" />
                    <span><strong>Preferred Language:</strong> {request.preferred_language}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="default" 
                      size="sm"
                      disabled={responding === request.id}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Accept Request
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Accept Booking Request</DialogTitle>
                      <DialogDescription>
                        You're about to accept this booking request. You can add an optional message for the parent.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="message">Message to Parent (Optional)</Label>
                        <Textarea
                          id="message"
                          placeholder="Hi! I'm excited to help with your babysitting needs..."
                          value={responseMessage}
                          onChange={(e) => setResponseMessage(e.target.value)}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setResponseMessage("")}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => handleResponse(request.id, 'accepted')}
                          disabled={responding === request.id}
                        >
                          {responding === request.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Confirm Acceptance
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={responding === request.id}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Decline
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Decline Booking Request</DialogTitle>
                      <DialogDescription>
                        You can decline this request and optionally provide a reason.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="decline_message">Reason (Optional)</Label>
                        <Textarea
                          id="decline_message"
                          placeholder="Sorry, I have a conflict during this time..."
                          value={responseMessage}
                          onChange={(e) => setResponseMessage(e.target.value)}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setResponseMessage("")}>
                          Cancel
                        </Button>
                        <Button 
                          variant="destructive"
                          onClick={() => handleResponse(request.id, 'declined')}
                          disabled={responding === request.id}
                        >
                          {responding === request.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Decline Request
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BookingRequests;