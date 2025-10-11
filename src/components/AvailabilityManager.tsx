import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Plus, X, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ResponsiveTimeInput } from "@/components/ui/responsive-time-input";
import { ResponsiveDateInput } from "@/components/ui/responsive-date-input";

interface AvailabilitySlot {
  id?: string;
  day: string;
  startTime: string;
  endTime: string;
}

interface UnavailableDate {
  id: string;
  unavailable_date: string;
  reason?: string;
}

interface AvailabilityManagerProps {
  sitterId: string;
  currentAvailability: AvailabilitySlot[];
  onAvailabilityUpdate: () => void;
}

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

const AvailabilityManager = ({ sitterId, currentAvailability, onAvailabilityUpdate }: AvailabilityManagerProps) => {
  const { toast } = useToast();
  const [availability, setAvailability] = useState<AvailabilitySlot[]>(currentAvailability || []);
  const [newSlot, setNewSlot] = useState<AvailabilitySlot>({
    day: '',
    startTime: '',
    endTime: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  
  // Phase 2.1: Unavailable dates state
  const [unavailableDates, setUnavailableDates] = useState<UnavailableDate[]>([]);
  const [newUnavailableDate, setNewUnavailableDate] = useState({
    date: '',
    reason: ''
  });
  const [loadingDates, setLoadingDates] = useState(false);

  useEffect(() => {
    setAvailability(currentAvailability || []);
    fetchUnavailableDates();
  }, [currentAvailability]);

  const fetchUnavailableDates = async () => {
    try {
      const { data, error } = await supabase
        .from('sitter_unavailable_dates')
        .select('*')
        .eq('sitter_id', sitterId)
        .order('unavailable_date', { ascending: true });

      if (error) throw error;
      setUnavailableDates(data || []);
    } catch (error) {
      console.error('Error fetching unavailable dates:', error);
    }
  };

  const addTimeSlot = () => {
    if (!newSlot.day || !newSlot.startTime || !newSlot.endTime) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields for the time slot.",
        variant: "destructive",
      });
      return;
    }

    if (newSlot.startTime >= newSlot.endTime) {
      toast({
        title: "Validation Error",
        description: "End time must be after start time.",
        variant: "destructive",
      });
      return;
    }

    const slot: AvailabilitySlot = {
      id: Date.now().toString(),
      ...newSlot
    };

    setAvailability(prev => [...prev, slot]);
    setNewSlot({ day: '', startTime: '', endTime: '' });
  };

  const removeTimeSlot = (index: number) => {
    setAvailability(prev => prev.filter((_, i) => i !== index));
  };

  const saveAvailability = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('sitters')
        .update({
          availability: availability as any
        })
        .eq('id', sitterId);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your availability has been updated.",
      });

      onAvailabilityUpdate();
    } catch (error) {
      console.error('Error saving availability:', error);
      toast({
        title: "Error",
        description: "Failed to save availability. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Phase 2.1: Add unavailable date
  const addUnavailableDate = async () => {
    if (!newUnavailableDate.date) {
      toast({
        title: "Validation Error",
        description: "Please select a date.",
        variant: "destructive",
      });
      return;
    }

    const selectedDate = new Date(newUnavailableDate.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      toast({
        title: "Validation Error",
        description: "Cannot block dates in the past.",
        variant: "destructive",
      });
      return;
    }

    setLoadingDates(true);
    try {
      const { error } = await supabase
        .from('sitter_unavailable_dates')
        .insert({
          sitter_id: sitterId,
          unavailable_date: newUnavailableDate.date,
          reason: newUnavailableDate.reason || null
        });

      if (error) throw error;

      toast({
        title: "Date Blocked!",
        description: "This date has been marked as unavailable.",
      });

      setNewUnavailableDate({ date: '', reason: '' });
      fetchUnavailableDates();
    } catch (error) {
      console.error('Error adding unavailable date:', error);
      toast({
        title: "Error",
        description: "Failed to add unavailable date. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingDates(false);
    }
  };

  // Phase 2.1: Remove unavailable date
  const removeUnavailableDate = async (dateId: string) => {
    try {
      const { error } = await supabase
        .from('sitter_unavailable_dates')
        .delete()
        .eq('id', dateId);

      if (error) throw error;

      toast({
        title: "Date Unblocked",
        description: "This date is now available for bookings.",
      });

      fetchUnavailableDates();
    } catch (error) {
      console.error('Error removing unavailable date:', error);
      toast({
        title: "Error",
        description: "Failed to remove unavailable date. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Add Available Times</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select 
                value={newSlot.day} 
                onValueChange={(value) => setNewSlot(prev => ({ ...prev, day: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map(day => (
                    <SelectItem key={day} value={day}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ResponsiveTimeInput 
                value={newSlot.startTime}
                onChange={(value) => setNewSlot(prev => ({ ...prev, startTime: value }))}
                label="Start Time"
                required
              />
              <ResponsiveTimeInput 
                value={newSlot.endTime}
                onChange={(value) => setNewSlot(prev => ({ ...prev, endTime: value }))}
                label="End Time"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label className="invisible">Add</Label>
              <Button onClick={addTimeSlot} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Slot
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Current Availability ({availability.length} slots)</span>
            </span>
            {availability.length > 0 && (
              <Button onClick={saveAvailability} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availability.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No availability set. Add time slots above to start receiving bookings.
            </p>
          ) : (
            <div className="space-y-3">
              {availability.map((slot, index) => (
                <div key={slot.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Badge variant="outline">{slot.day}</Badge>
                    <span className="font-medium">
                      {slot.startTime} - {slot.endTime}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTimeSlot(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phase 2.1: Unavailable Dates Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Ban className="h-5 w-5" />
            <span>Block Specific Dates</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Mark dates when you're unavailable (vacation, exams, etc.)
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <ResponsiveDateInput
              value={newUnavailableDate.date}
              onChange={(value) => setNewUnavailableDate(prev => ({ ...prev, date: value }))}
              label="Select Date"
              id="unavailable-date"
              min={new Date().toISOString().split('T')[0]}
            />
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Input
                id="reason"
                value={newUnavailableDate.reason}
                onChange={(e) => setNewUnavailableDate(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="e.g., Vacation, Exams"
              />
            </div>
            <div className="space-y-2">
              <Label className="invisible">Add</Label>
              <Button 
                onClick={addUnavailableDate} 
                disabled={loadingDates}
                className="w-full"
                variant="destructive"
              >
                <Ban className="h-4 w-4 mr-2" />
                {loadingDates ? "Adding..." : "Block Date"}
              </Button>
            </div>
          </div>

          {unavailableDates.length > 0 && (
            <div className="space-y-3 mt-4">
              <h4 className="font-semibold text-sm">Blocked Dates ({unavailableDates.length})</h4>
              {unavailableDates.map((date) => (
                <div key={date.id} className="flex items-center justify-between p-3 border rounded-lg bg-destructive/5">
                  <div>
                    <Badge variant="destructive">
                      {new Date(date.unavailable_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </Badge>
                    {date.reason && (
                      <p className="text-sm text-muted-foreground mt-1">{date.reason}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeUnavailableDate(date.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AvailabilityManager;