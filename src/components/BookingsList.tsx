import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, DollarSign, MapPin, Loader2, Languages } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "./EmptyState";

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  num_children: number;
  total_cost: number;
  sitter_hourly_rate: number;
  status: string;
  special_notes: string | null;
  preferred_language: string | null;
  user_id: string;
  sitter_id: string | null;
  profiles?: {
    first_name: string;
    last_name: string;
    phone: string;
    address: string;
  };
  sitters?: {
    first_name: string;
    last_name: string;
  };
}

interface BookingsListProps {
  sitterId?: string; // Make optional since we'll use auth user
}

const BookingsList = ({ sitterId }: BookingsListProps) => {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>("");

  useEffect(() => {
    fetchBookings();

    // Set up real-time listener for booking updates
    const channel = supabase
      .channel('bookings-sitter-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchBookings = async () => {
    try {
      
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('BookingsList: No authenticated user found');
        setDebugInfo("No authenticated user found");
        return;
      }
      
      
      setDebugInfo(`User ID: ${user.id}`);

      // Get sitter info using user_id instead of sitter id
      const { data: sitterData, error: sitterError } = await supabase
        .from('sitters')
        .select('id, first_name, last_name')
        .eq('user_id', user.id)
        .single();

      if (sitterError) {
        console.error('BookingsList: Error fetching sitter data:', sitterError);
        setDebugInfo(`Error fetching sitter: ${sitterError.message}`);
        return;
      }
      
      if (!sitterData) {
        console.error('BookingsList: No sitter profile found for user');
        setDebugInfo("No sitter profile found for user");
        return;
      }

      const sitterName = `${sitterData.first_name} ${sitterData.last_name}`;
      
      setDebugInfo(`Sitter: ${sitterName}`);

      // Fetch bookings where this sitter is selected
      // IMPORTANT: Do not embed sitters in the select because bookings.sitter_id has no FK
      // which causes "Could not find a relationship" errors.
      const { data: bookingsWithProfiles, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          profiles!inner(
            first_name,
            last_name,
            phone,
            address
          )
        `)
        .eq('sitter_id', sitterData.id)
        .order('booking_date', { ascending: true }) as { data: any[] | null; error: any };

      if (bookingsError) {
        console.error('BookingsList: Error fetching bookings:', bookingsError);

        // Fallback: fetch bookings without profile join (still render bookings)
        const { data: basicBookings, error: basicError } = await supabase
          .from('bookings')
          .select('*')
          .eq('sitter_id', sitterData.id)
          .order('booking_date', { ascending: true });

        if (basicError) {
          setDebugInfo(`Error fetching bookings: ${basicError.message}`);
          return;
        }

        const mappedBasic = (basicBookings || []).map((booking: any) => ({
          ...booking,
          profiles: undefined,
          sitters: { first_name: sitterData.first_name, last_name: sitterData.last_name },
        }));

        setBookings(mappedBasic as any);
        setDebugInfo(`Found ${mappedBasic.length} bookings (without profiles)`);
        return;
      }

      if (!bookingsWithProfiles || bookingsWithProfiles.length === 0) {
        setDebugInfo(`No bookings found for ${sitterName}`);
        setBookings([]);
        return;
      }

      const mappedBookings = (bookingsWithProfiles || []).map((booking: any) => ({
        ...booking,
        // Ensure profiles is an object (not an array)
        profiles: Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles,
        // Attach sitter name from sitter profile (no join)
        sitters: { first_name: sitterData.first_name, last_name: sitterData.last_name },
      }));

      setBookings(mappedBookings as any);
      setDebugInfo(`Found ${mappedBookings.length} bookings`);
    } catch (error) {
      console.error('BookingsList: Error in fetchBookings:', error);
      setDebugInfo(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: "Error",
        description: "Failed to load bookings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;

      setBookings(prev => 
        prev.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: newStatus }
            : booking
        )
      );

      // Send confirmation email to parent if booking is confirmed
      if (newStatus === 'confirmed') {
        const booking = bookings.find(b => b.id === bookingId);
        if (booking) {
          try {
            const parentName = booking.profiles
              ? `${booking.profiles.first_name} ${booking.profiles.last_name}`
              : 'Parent';
            const address = booking.profiles?.address || '';
            
            const { data: emailData, error: emailError } = await supabase.functions.invoke('send-booking-confirmation', {
              body: {
                bookingId: booking.id,
                parentUserId: booking.user_id,
                parentName,
                sitterName: booking.sitters ? `${booking.sitters.first_name} ${booking.sitters.last_name}` : 'Unknown',
                bookingDate: booking.booking_date,
                startTime: booking.start_time,
                endTime: booking.end_time,
                numChildren: booking.num_children,
                totalCost: booking.total_cost,
                address,
                specialNotes: booking.special_notes,
                preferredLanguage: booking.preferred_language
              }
            });
            

            if (emailError) {
              console.error('Failed to send confirmation email:', emailError);
              toast({
                title: 'Email not sent',
                description: typeof emailError.message === 'string' ? emailError.message : 'We could not notify the parent via email. Please verify your email sender settings.',
                variant: 'destructive',
              });
            } else {
              
            }
          } catch (emailError) {
            console.error('Error sending confirmation email:', emailError);
          }
        }
      }

      toast({
        title: "Success!",
        description: newStatus === 'confirmed' 
          ? `Booking confirmed! The parent has been notified via email.`
          : `Booking ${newStatus} successfully.`,
      });
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast({
        title: "Error",
        description: "Failed to update booking status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'completed':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>My Bookings ({bookings.length})</span>
          </CardTitle>
          {debugInfo && (
            <p className="text-sm text-muted-foreground">Debug: {debugInfo}</p>
          )}
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No Bookings Yet"
              description="You'll receive bookings here once families book you."
              tips={[
                "Make sure your availability is up to date",
                "Complete your profile with experience and skills",
                "Be responsive when families reach out",
                "Weekend and evening slots get more bookings"
              ]}
            />
          ) : (
            <div className="space-y-4">
              {bookings.map(booking => (
                <Card key={booking.id} className="border">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">
                            {booking.profiles?.first_name || 'N/A'} {booking.profiles?.last_name || 'N/A'}
                          </h3>
                          <Badge variant={getStatusColor(booking.status)}>
                            {booking.status}
                          </Badge>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground space-x-4">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{booking.booking_date}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{booking.start_time} - {booking.end_time}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span>{booking.num_children} {booking.num_children === 1 ? 'child' : 'children'}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-4 w-4" />
                            <span>€{booking.total_cost}</span>
                          </div>
                        </div>
                      </div>
                      
                      {booking.status === 'pending' && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                          >
                            Decline
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="flex items-center space-x-1 text-muted-foreground mb-1">
                          <MapPin className="h-4 w-4" />
                          <span>Address:</span>
                        </div>
                        <p>{booking.profiles?.address || 'N/A'}</p>
                      </div>
                      
                      <div>
                        <div className="text-muted-foreground mb-1">Phone:</div>
                        <p>{booking.profiles?.phone || 'N/A'}</p>
                      </div>
                    </div>

                    {booking.preferred_language && (
                      <div className="mt-4">
                        <div className="flex items-center space-x-1 text-muted-foreground text-sm mb-1">
                          <Languages className="h-4 w-4" />
                          <span>Preferred Language:</span>
                        </div>
                        <p className="text-sm bg-accent/50 px-3 py-2 rounded-lg">
                          {booking.preferred_language}
                        </p>
                      </div>
                    )}

                    {booking.special_notes && (
                      <div className="mt-4">
                        <div className="text-muted-foreground text-sm mb-1">Special Notes:</div>
                        <p className="text-sm bg-muted p-3 rounded-lg">
                          {booking.special_notes}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingsList;