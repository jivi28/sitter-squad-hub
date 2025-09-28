import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MobileTimePicker } from "@/components/ui/mobile-time-picker";

interface AvailabilitySlot {
  id?: string;
  day: string;
  startTime: string;
  endTime: string;
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

  useEffect(() => {
    setAvailability(currentAvailability || []);
  }, [currentAvailability]);

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
              <MobileTimePicker 
                value={newSlot.startTime}
                onChange={(value) => setNewSlot(prev => ({ ...prev, startTime: value }))}
                label="Start Time"
                required
              />
              <MobileTimePicker 
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
    </div>
  );
};

export default AvailabilityManager;