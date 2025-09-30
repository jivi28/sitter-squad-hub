import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface ResponsiveTimeInputProps {
  value: string; // HH:MM format (24-hour)
  onChange: (value: string) => void;
  label?: string;
  id?: string;
  required?: boolean;
  className?: string;
}

export const ResponsiveTimeInput: React.FC<ResponsiveTimeInputProps> = ({
  value,
  onChange,
  label,
  id,
  required = false,
  className,
}) => {
  const isMobile = useIsMobile();

  // Mobile: Dropdown with 24-hour format and 15-minute intervals
  if (isMobile) {
    const [hour, minute] = value ? value.split(':') : ['', ''];
    
    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    const minutes = ['00', '15', '30', '45'];

    const updateTime = (newHour: string, newMinute: string) => {
      if (newHour && newMinute) {
        onChange(`${newHour}:${newMinute}`);
      }
    };

    return (
      <div className={cn("space-y-2", className)}>
        {label && <Label htmlFor={id}>{label}</Label>}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hour (24h)</Label>
            <Select value={hour} onValueChange={(h) => updateTime(h, minute)} required={required}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="HH" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {hours.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Minute</Label>
            <Select value={minute} onValueChange={(m) => updateTime(hour, m)} required={required}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="MM" />
              </SelectTrigger>
              <SelectContent>
                {minutes.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  }

  // Desktop: Native HTML5 time input
  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <Input
        type="time"
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="h-11"
      />
    </div>
  );
};
