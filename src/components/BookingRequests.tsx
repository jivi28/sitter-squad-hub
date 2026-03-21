import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, DollarSign, MapPin, Loader2, Languages, CheckCircle, XCircle, Baby, Dog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import BookingRequestFilters, { FilterValues } from "@/components/BookingRequestFilters";
import { EmptyState } from "@/components/EmptyState";

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
  service_type: string;
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
  const [appliedBookings, setAppliedBookings] = useState<string[]>([]);
  
  // Filter state
  const [filters, setFilters] = useState<FilterValues>(() => {
    // Try to load saved filters from localStorage
    const userId = localStorage.getItem('user_id');
    if (userId) {
      try {
        const saved = localStorage.getItem(`sitter_request_filters_${userId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Convert date strings back to Date objects
          if (parsed.dateRange?.from) parsed.dateRange.from = new Date(parsed.dateRange.from);
          if (parsed.dateRange?.to) parsed.dateRange.to = new Date(parsed.dateRange.to);
          return parsed;
        }
      } catch {}
    }
    return {
      dateRange: { from: undefined, to: undefined },
      serviceType: 'all' as const,
      minRate: 0,
      sortBy: 'date' as const
    };
  });

  useEffect(() => {
    fetchBookingRequests();
    // Store user_id for filter persistence
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) localStorage.setItem('user_id', user.id);
    });

    // Set up real-time listener for new booking requests
    const channel = supabase
      .channel('booking-requests-sitter')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
        },
        () => {
          fetchBookingRequests();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
        },
        () => {
          fetchBookingRequests();
        }
      )
      .subscribe();

    // Refetch when tab/window regains focus (catches cases realtime misses due to RLS)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchBookingRequests();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', fetchBookingRequests);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', fetchBookingRequests);
    };
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

      // Check which bookings the sitter has already applied to
      const { data: responses, error: responsesError } = await supabase
        .from('booking_responses')
        .select('booking_id')
        .eq('sitter_id', sitterData.id);

      if (!responsesError) {
        setAppliedBookings(responses?.map(r => r.booking_id) || []);
      }

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

  // Filter and sort requests
  const filteredRequests = requests.filter(request => {
    // Filter out expired requests
    if (request.request_expires_at) {
      const expiryTime = new Date(request.request_expires_at).getTime();
      if (expiryTime < Date.now()) {
        return false; // Don't show expired requests
      }
    }

    // Date range filter
    if (filters.dateRange.from) {
      const bookingDate = new Date(request.booking_date);
      if (bookingDate < filters.dateRange.from) return false;
    }
    if (filters.dateRange.to) {
      const bookingDate = new Date(request.booking_date);
      if (bookingDate > filters.dateRange.to) return false;
    }
    
    // Service type filter
    if (filters.serviceType !== 'all' && request.service_type !== filters.serviceType) {
      return false;
    }
    
    // Minimum rate filter
    if (filters.minRate > 0 && sitter) {
      const estimatedPay = calculateCost(request.start_time, request.end_time);
      if (estimatedPay < filters.minRate * calculateHours(request.start_time, request.end_time)) {
        return false;
      }
    }
    
    return true;
  }).sort((a, b) => {
    switch (filters.sortBy) {
      case 'date':
        return new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime();
      case 'pay':
        return calculateCost(b.start_time, b.end_time) - calculateCost(a.start_time, a.end_time);
      case 'expires':
        if (!a.request_expires_at || !b.request_expires_at) return 0;
        return new Date(a.request_expires_at).getTime() - new Date(b.request_expires_at).getTime();
      default:
        return 0;
    }
  });

  const handleFiltersChange = (newFilters: FilterValues) => {
    setFilters(newFilters);
    // Save to localStorage
    const userId = localStorage.getItem('user_id');
    if (userId) {
      try {
        localStorage.setItem(`sitter_request_filters_${userId}`, JSON.stringify(newFilters));
      } catch {}
    }
  };

  const handleClearFilters = () => {
    const defaultFilters: FilterValues = {
      dateRange: { from: undefined, to: undefined },
      serviceType: 'all',
      minRate: 0,
      sortBy: 'date'
    };
    handleFiltersChange(defaultFilters);
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
      <>
        <BookingRequestFilters 
          filters={filters} 
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
        />
        <EmptyState
          icon={Calendar}
          title="No New Requests"
          description="New booking requests that match your availability will appear here."
        />
      </>
    );
  }

  if (filteredRequests.length === 0) {
    return (
      <>
        <BookingRequestFilters 
          filters={filters} 
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
        />
        <EmptyState
          icon={Calendar}
          title="No Matching Requests"
          description="No requests match your current filters. Try adjusting your criteria."
          actionLabel="Clear Filters"
          onAction={handleClearFilters}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <BookingRequestFilters 
        filters={filters} 
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
      />
      
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Booking Requests</h2>
        <Badge variant="secondary">
          Showing {filteredRequests.length} of {requests.length}
        </Badge>
      </div>

      <div className="grid gap-4">
        {filteredRequests.map((request) => (
          <Card key={request.id} className="border-2 border-primary/20 bg-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {request.service_type === 'pet_sitting' ? <Dog className="h-5 w-5" /> : <Baby className="h-5 w-5" />}
                  {request.profiles ? 
                    `${request.profiles.first_name} ${request.profiles.last_name}` : 
                    (request.service_type === 'pet_sitting' ? "Pet Owner" : "Parent")
                  }
                </CardTitle>
                <div className="flex gap-2">
                  <Badge variant="default">
                    {request.service_type === 'pet_sitting' ? 'Pet Sitting' : 'Babysitting'}
                  </Badge>
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
                  {request.service_type === 'pet_sitting' ? <Dog className="h-4 w-4 text-muted-foreground" /> : <Users className="h-4 w-4 text-muted-foreground" />}
                  <span>{request.num_children} {request.service_type === 'pet_sitting' ? 'pets' : 'children'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">
                    €{calculateCost(request.start_time, request.end_time).toFixed(2)}
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
                      <strong>Children Ages:</strong> {request.profiles.children_ages}
                    </p>
                    {request.profiles.special_needs && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Special Needs:</strong> {request.profiles.special_needs}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground italic">
                      📱 Contact information will be shared after you're selected for the booking
                    </p>
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
                {appliedBookings.includes(request.id) ? (
                  <div className="w-full text-center py-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      ✓ Application Submitted
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-2">
                      You've applied for this booking. The parent will review applications and choose their preferred sitter.
                    </p>
                  </div>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BookingRequests;