import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, MapPin, Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface BookingDetails {
  date: string;
  startTime: string;
  endTime: string;
  children: number;
  notes: string;
}

interface AvailabilitySlot {
  day: string;
  startTime: string;
  endTime: string;
}

interface Sitter {
  id: string;
  first_name: string;
  last_name: string;
  hourly_rate: number;
  experience: string;
  special_skills: string;
  availability: any; // Supabase Json type - will be AvailabilitySlot[] in runtime
}

const BookingSystem = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedSitter, setSelectedSitter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [availableSitters, setAvailableSitters] = useState<Sitter[]>([]);
  const [loadingSitters, setLoadingSitters] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails>({
    date: "",
    startTime: "",
    endTime: "",
    children: 1,
    notes: ""
  });

  // Get day of week from date
  const getDayOfWeek = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  // Check if times overlap
  const timesOverlap = (start1: string, end1: string, start2: string, end2: string) => {
    return start1 < end2 && end1 > start2;
  };

  // Filter sitters by availability
  const filterSittersByAvailability = (sitters: any[], requestedDate: string, startTime: string, endTime: string) => {
    if (!requestedDate || !startTime || !endTime) return [];
    
    const requestedDay = getDayOfWeek(requestedDate);
    console.log('Filtering sitters:', {
      requestedDate,
      requestedDay,
      startTime,
      endTime,
      sittersCount: sitters?.length || 0,
      sitters: sitters?.map(s => ({
        name: `${s.first_name} ${s.last_name}`,
        availability: s.availability
      }))
    });
    
    return sitters.filter(sitter => {
      if (!sitter.availability || !Array.isArray(sitter.availability)) {
        console.log('Sitter filtered out - no availability:', `${sitter.first_name} ${sitter.last_name}`);
        return false;
      }
      
      const hasMatchingSlot = sitter.availability.some((slot: AvailabilitySlot) => {
        const dayMatch = slot.day === requestedDay;
        const timeMatch = timesOverlap(startTime, endTime, slot.startTime, slot.endTime);
        console.log('Checking slot:', {
          sitterName: `${sitter.first_name} ${sitter.last_name}`,
          slot,
          requestedDay,
          dayMatch,
          timeMatch,
          timesOverlapCheck: `${startTime} < ${slot.endTime} && ${endTime} > ${slot.startTime}`
        });
        return dayMatch && timeMatch;
      });
      
      if (!hasMatchingSlot) {
        console.log('Sitter filtered out - no matching availability:', `${sitter.first_name} ${sitter.last_name}`);
      }
      
      return hasMatchingSlot;
    });
  };

  // Fetch available sitters when booking details change
  useEffect(() => {
    const fetchAvailableSitters = async () => {
      if (!bookingDetails.date || !bookingDetails.startTime || !bookingDetails.endTime) {
        setAvailableSitters([]);
        return;
      }

      setLoadingSitters(true);
      try {
        const { data: sitters, error } = await supabase
          .from('sitters')
          .select('*')
          .eq('status', 'approved');

        if (error) throw error;

        const filteredSitters = filterSittersByAvailability(
          sitters || [],
          bookingDetails.date,
          bookingDetails.startTime,
          bookingDetails.endTime
        );

        setAvailableSitters(filteredSitters);
      } catch (error) {
        console.error('Error fetching sitters:', error);
        toast({
          title: "Error",
          description: "Failed to load available sitters. Please try again.",
          variant: "destructive"
        });
        setAvailableSitters([]);
      } finally {
        setLoadingSitters(false);
      }
    };

    fetchAvailableSitters();
  }, [bookingDetails.date, bookingDetails.startTime, bookingDetails.endTime]);

  const calculateHours = () => {
    if (!bookingDetails.startTime || !bookingDetails.endTime) return 0;
    const start = new Date(`1970-01-01T${bookingDetails.startTime}`);
    const end = new Date(`1970-01-01T${bookingDetails.endTime}`);
    const diffMs = end.getTime() - start.getTime();
    return Math.max(0, diffMs / (1000 * 60 * 60));
  };

  const isBookingComplete = () => {
    return bookingDetails.date && 
           bookingDetails.startTime && 
           bookingDetails.endTime && 
           bookingDetails.children > 0;
  };

  const updateBookingDetails = (field: keyof BookingDetails, value: string | number) => {
    setBookingDetails(prev => ({ ...prev, [field]: value }));
    // Reset selected sitter when booking details change
    if (selectedSitter) {
      setSelectedSitter(null);
    }
  };

  const handleBooking = async () => {
    if (!user || !selectedSitter || !isBookingComplete()) {
      toast({
        title: "Booking incomplete",
        description: "Please fill in all required fields and select a sitter.",
        variant: "destructive"
      });
      return;
    }

    const selectedSitterData = availableSitters.find(s => s.id === selectedSitter);
    if (!selectedSitterData) return;

    setIsLoading(true);

    try {
      const totalCost = selectedSitterData.hourly_rate * estimatedHours;

      const { error } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          sitter_name: `${selectedSitterData.first_name} ${selectedSitterData.last_name}`,
          sitter_hourly_rate: selectedSitterData.hourly_rate,
          booking_date: bookingDetails.date,
          start_time: bookingDetails.startTime,
          end_time: bookingDetails.endTime,
          num_children: bookingDetails.children,
          special_notes: bookingDetails.notes || null,
          total_cost: totalCost,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Booking submitted!",
        description: `Your booking with ${selectedSitterData.first_name} ${selectedSitterData.last_name} has been submitted successfully. You'll receive a confirmation email shortly.`,
      });

      // Reset form
      setSelectedSitter(null);
      setBookingDetails({
        date: "",
        startTime: "",
        endTime: "",
        children: 1,
        notes: ""
      });

    } catch (error: any) {
      console.error('Booking error:', error);
      toast({
        title: "Booking failed",
        description: error.message || "There was an error submitting your booking. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const estimatedHours = calculateHours();
  const showSitters = isBookingComplete();
  const hasSitters = availableSitters.length > 0;

  return (
    <section id="booking-system" className="py-20 bg-gradient-soft">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Book a Sitter
          </h2>
          <p className="text-xl text-muted-foreground">
            {showSitters ? 
              (loadingSitters ? "Finding available sitters..." : 
               hasSitters ? "Choose from our verified student babysitters" : "No sitters available for your selected time") 
              : "Please fill in your booking details to see available sitters"}
          </p>
        </div>

        <div className={`grid gap-8 max-w-6xl mx-auto ${showSitters && hasSitters ? 'lg:grid-cols-3' : 'justify-center'}`}>
          {showSitters && (
            <div className="lg:col-span-2 space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-semibold text-foreground mb-2">
                  {loadingSitters ? "Finding Sitters..." : "Available Sitters"}
                </h3>
                <p className="text-muted-foreground">
                  {loadingSitters ? "Please wait while we find sitters available for your time slot" : 
                   hasSitters ? "Select a sitter for your booking" : "Try adjusting your date or time to find available sitters"}
                </p>
              </div>
              {loadingSitters ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : hasSitters ? (
                <div className="grid gap-6">
                  {availableSitters.map((sitter) => (
                    <Card 
                      key={sitter.id} 
                      className={`cursor-pointer transition-all duration-300 hover:shadow-glow ${
                        selectedSitter === sitter.id ? 'ring-2 ring-primary shadow-glow' : ''
                      }`}
                      onClick={() => setSelectedSitter(sitter.id)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            <div className="text-4xl">👩‍🎓</div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h3 className="text-xl font-semibold text-foreground">
                                  {sitter.first_name} {sitter.last_name}
                                </h3>
                                <div className="flex items-center space-x-1">
                                  <Star className="w-4 h-4 fill-secondary text-secondary" />
                                  <span className="text-sm font-medium">5.0</span>
                                  <span className="text-sm text-muted-foreground">(New)</span>
                                </div>
                              </div>
                              <p className="text-muted-foreground mb-2">
                                {sitter.experience} experience
                              </p>
                              {sitter.special_skills && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {sitter.special_skills.split(',').map((skill, index) => (
                                    <span 
                                      key={index}
                                      className="px-2 py-1 bg-accent text-accent-foreground text-xs rounded-full"
                                    >
                                      {skill.trim()}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-4 h-4" />
                                  <span>Available for your time</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <MapPin className="w-4 h-4" />
                                  <span>Local area</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">${sitter.hourly_rate}</div>
                            <div className="text-sm text-muted-foreground">per hour</div>
                            <Button 
                              variant={selectedSitter === sitter.id ? "default" : "outline"} 
                              size="sm" 
                              className="mt-2"
                            >
                              {selectedSitter === sitter.id ? "Selected" : "Select"}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No sitters are available for your selected time slot.</p>
                  <p className="text-sm text-muted-foreground mt-2">Try changing your date or time to find available sitters.</p>
                </div>
              )}
            </div>
          )}

          <div className={showSitters && hasSitters ? "lg:col-span-1" : "max-w-md mx-auto"}>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span>Booking Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input 
                    type="date" 
                    id="date" 
                    value={bookingDetails.date}
                    onChange={(e) => updateBookingDetails("date", e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="start-time">Start Time</Label>
                    <Input 
                      type="time" 
                      id="start-time" 
                      value={bookingDetails.startTime}
                      onChange={(e) => updateBookingDetails("startTime", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-time">End Time</Label>
                    <Input 
                      type="time" 
                      id="end-time" 
                      value={bookingDetails.endTime}
                      onChange={(e) => updateBookingDetails("endTime", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="children">Number of Children</Label>
                  <Input 
                    type="number" 
                    id="children" 
                    min="1" 
                    max="5" 
                    value={bookingDetails.children}
                    onChange={(e) => updateBookingDetails("children", parseInt(e.target.value) || 1)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Special Instructions</Label>
                  <Textarea 
                    id="notes"
                    placeholder="Any special needs or instructions..."
                    value={bookingDetails.notes}
                    onChange={(e) => updateBookingDetails("notes", e.target.value)}
                  />
                </div>

                {selectedSitter && estimatedHours > 0 && (
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Hourly Rate:</span>
                      <span>${availableSitters.find(s => s.id === selectedSitter)?.hourly_rate}/hr</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Estimated Hours:</span>
                      <span>{estimatedHours.toFixed(1)} hours</span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg border-t border-border pt-2">
                      <span>Total:</span>
                      <span>${((availableSitters.find(s => s.id === selectedSitter)?.hourly_rate || 0) * estimatedHours).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <Button 
                  variant="book" 
                  className="w-full" 
                  size="lg"
                  disabled={!selectedSitter || !isBookingComplete() || estimatedHours <= 0 || isLoading || !user}
                  onClick={handleBooking}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {!user ? "Login Required" : !showSitters ? "Fill Details to Continue" : !selectedSitter ? "Select a Sitter" : isLoading ? "Booking..." : "Book Now"}
                </Button>

                <div className="text-xs text-muted-foreground text-center">
                  By booking, you agree to our terms and conditions
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BookingSystem;