import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface MobileDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  minYear?: number;
  maxYear?: number;
  required?: boolean;
  label?: string;
}

export const MobileDatePicker: React.FC<MobileDatePickerProps> = ({
  value,
  onChange,
  placeholder = "Select date",
  className,
  id,
  minYear,
  maxYear,
  required = false,
  label
}) => {
  // Parse the current value (YYYY-MM-DD format)
  const [year, month, day] = value ? value.split('-') : ['', '', ''];
  
  // Generate year options based on context
  const currentYear = new Date().getFullYear();
  const startYear = minYear || 1980;
  const endYear = maxYear || currentYear + 5;
  
  const years = Array.from(
    { length: endYear - startYear + 1 }, 
    (_, i) => startYear + i
  ).reverse(); // Most recent years first
  
  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];
  
  // Get number of days in selected month/year
  const getDaysInMonth = (year: string, month: string) => {
    if (!year || !month) return 31;
    return new Date(parseInt(year), parseInt(month), 0).getDate();
  };
  
  const daysInMonth = getDaysInMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0'));
  
  const updateDate = (newYear: string, newMonth: string, newDay: string) => {
    if (newYear && newMonth && newDay) {
      onChange(`${newYear}-${newMonth}-${newDay}`);
    }
  };
  
  const handleYearChange = (newYear: string) => {
    updateDate(newYear, month, day);
  };
  
  const handleMonthChange = (newMonth: string) => {
    // If current day is invalid for new month, reset to 1st
    const maxDays = getDaysInMonth(year, newMonth);
    const newDay = parseInt(day) > maxDays ? '01' : day;
    updateDate(year, newMonth, newDay);
  };
  
  const handleDayChange = (newDay: string) => {
    updateDate(year, month, newDay);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Year</Label>
          <Select value={year} onValueChange={handleYearChange} required={required}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {years.map((yearValue) => (
                <SelectItem key={yearValue} value={yearValue.toString()}>
                  {yearValue}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Month</Label>
          <Select value={month} onValueChange={handleMonthChange} required={required}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((monthOption) => (
                <SelectItem key={monthOption.value} value={monthOption.value}>
                  {monthOption.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Day</Label>
          <Select value={day} onValueChange={handleDayChange} required={required}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Day" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {days.map((dayValue) => (
                <SelectItem key={dayValue} value={dayValue}>
                  {dayValue}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};