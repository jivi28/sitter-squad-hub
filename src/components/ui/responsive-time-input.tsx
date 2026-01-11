import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MobileTimePicker } from "@/components/ui/mobile-time-picker";
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

  // Mobile: Use MobileTimePicker with 12-hour format
  if (isMobile) {
    return (
      <MobileTimePicker
        value={value}
        onChange={onChange}
        label={label}
        id={id}
        required={required}
        className={className}
      />
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
