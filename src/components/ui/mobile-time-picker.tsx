import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface MobileTimePickerProps {
  value: string; // HH:MM format (24-hour)
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  required?: boolean;
  label?: string;
}

export const MobileTimePicker: React.FC<MobileTimePickerProps> = ({
  value,
  onChange,
  placeholder = "Select time",
  className,
  id,
  required = false,
  label
}) => {
  // Parse the current value (HH:MM format)
  const [hour24, minute] = value ? value.split(':') : ['', ''];
  
  // Convert 24-hour to 12-hour format
  const hour12 = hour24 ? (parseInt(hour24) % 12 || 12).toString() : '';
  const period = hour24 ? (parseInt(hour24) >= 12 ? 'PM' : 'AM') : '';

  // Generate options
  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  const periods = ['AM', 'PM'];

  const updateTime = (newHour: string, newMinute: string, newPeriod: string) => {
    if (newHour && newMinute && newPeriod) {
      // Convert 12-hour to 24-hour format
      let hour24 = parseInt(newHour);
      if (newPeriod === 'PM' && hour24 !== 12) hour24 += 12;
      if (newPeriod === 'AM' && hour24 === 12) hour24 = 0;
      
      const hour24Str = hour24.toString().padStart(2, '0');
      onChange(`${hour24Str}:${newMinute}`);
    }
  };

  const handleHourChange = (newHour: string) => {
    updateTime(newHour, minute, period);
  };

  const handleMinuteChange = (newMinute: string) => {
    updateTime(hour12, newMinute, period);
  };

  const handlePeriodChange = (newPeriod: string) => {
    updateTime(hour12, minute, newPeriod);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Hour</Label>
          <Select value={hour12} onValueChange={handleHourChange} required={required}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Hr" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {hours.map((hourValue) => (
                <SelectItem key={hourValue} value={hourValue}>
                  {hourValue}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Minute</Label>
          <Select value={minute} onValueChange={handleMinuteChange} required={required}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Min" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {minutes.filter((_, i) => i % 5 === 0).map((minuteValue) => (
                <SelectItem key={minuteValue} value={minuteValue}>
                  {minuteValue}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">AM/PM</Label>
          <Select value={period} onValueChange={handlePeriodChange} required={required}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="AM/PM" />
            </SelectTrigger>
            <SelectContent>
              {periods.map((periodValue) => (
                <SelectItem key={periodValue} value={periodValue}>
                  {periodValue}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};