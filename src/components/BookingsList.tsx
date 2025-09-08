import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, DollarSign, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  user_id: string;
  profiles?: {
    first_name: string;
    last_name: string;
    phone: string;
    address: string;
  };
}

interface BookingsListProps {
  sitterId: string;
}

const BookingsList = ({ sitterId }: BookingsListProps) => {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, [sitterId]);

  const fetchBookings = async () => {
    try {
      // Get sitter info first to get their name
      const { data: sitterData, error: sitterError } = await supabase
        .from('Sitter profiles')
        .select('first_name, last_name')
        .eq('id', sitterId)
        .single();

      if (sitterError) throw sitterError;

      const sitterName = `${sitterData.first_name} ${sitterData.last_name}`;

      // Fetch bookings where this sitter is selected
      const { data, error } = await supabase
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
        .eq('sitter_name', sitterName)
        .order('booking_date', { ascending: true }) as { data: any[] | null; error: any };

      if (error) throw error;

      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
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

      toast({
        title: "Success!",
        description: `Booking ${newStatus} successfully.`,
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
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No bookings yet</h3>
              <p className="text-muted-foreground">
                You'll see your booking requests here once families start booking you!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map(booking => (
                <Card key={booking.id} className="border">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">
                            {booking.profiles?.first_name} {booking.profiles?.last_name}
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
                            <span>${booking.total_cost}</span>
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
                        <p>{booking.profiles?.address}</p>
                      </div>
                      
                      <div>
                        <div className="text-muted-foreground mb-1">Phone:</div>
                        <p>{booking.profiles?.phone}</p>
                      </div>
                    </div>

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