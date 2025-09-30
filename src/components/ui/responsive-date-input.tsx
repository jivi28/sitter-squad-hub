import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ResponsiveDateInputProps {
  value: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  label?: string;
  id?: string;
  required?: boolean;
  className?: string;
  min?: string; // YYYY-MM-DD format
}

export const ResponsiveDateInput: React.FC<ResponsiveDateInputProps> = ({
  value,
  onChange,
  label,
  id,
  required = false,
  className,
  min,
}) => {
  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <Input
        type="date"
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        min={min}
        className="h-11"
      />
    </div>
  );
};
