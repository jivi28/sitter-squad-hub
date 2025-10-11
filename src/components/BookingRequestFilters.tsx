import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Filter, X, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface FilterValues {
  dateRange: { from?: Date; to?: Date };
  serviceType: 'all' | 'babysitting' | 'pet_sitting';
  minRate: number;
  sortBy: 'date' | 'pay' | 'expires';
}

interface BookingRequestFiltersProps {
  filters: FilterValues;
  onFiltersChange: (filters: FilterValues) => void;
  onClearFilters: () => void;
}

const BookingRequestFilters = ({ filters, onFiltersChange, onClearFilters }: BookingRequestFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = <K extends keyof FilterValues>(key: K, value: FilterValues[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = 
    filters.dateRange.from || 
    filters.serviceType !== 'all' || 
    filters.minRate > 0 ||
    filters.sortBy !== 'date';

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-4 w-4" />
            Filter Requests
            {hasActiveFilters && (
              <span className="text-xs font-normal text-muted-foreground">
                (Active)
              </span>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={onClearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Hide' : 'Show'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange.from ? (
                      filters.dateRange.to ? (
                        <>
                          {format(filters.dateRange.from, "LLL dd")} -{" "}
                          {format(filters.dateRange.to, "LLL dd")}
                        </>
                      ) : (
                        format(filters.dateRange.from, "LLL dd, yyyy")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={filters.dateRange.from}
                    selected={{ from: filters.dateRange.from, to: filters.dateRange.to }}
                    onSelect={(range) => updateFilter('dateRange', { from: range?.from, to: range?.to })}
                    numberOfMonths={2}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Sort By */}
            <div className="space-y-2">
              <Label>Sort By</Label>
              <Select value={filters.sortBy} onValueChange={(value) => updateFilter('sortBy', value as FilterValues['sortBy'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date (Soonest First)</SelectItem>
                  <SelectItem value="pay">Pay (Highest First)</SelectItem>
                  <SelectItem value="expires">Expires Soon</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Service Type */}
          <div className="space-y-2">
            <Label>Service Type</Label>
            <RadioGroup 
              value={filters.serviceType} 
              onValueChange={(value) => updateFilter('serviceType', value as FilterValues['serviceType'])}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="cursor-pointer font-normal">All</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="babysitting" id="filter-babysitting" />
                <Label htmlFor="filter-babysitting" className="cursor-pointer font-normal">Babysitting</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pet_sitting" id="filter-pet-sitting" />
                <Label htmlFor="filter-pet-sitting" className="cursor-pointer font-normal">Pet Sitting</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Minimum Rate */}
          <div className="space-y-2">
            <Label>Minimum Hourly Rate: €{filters.minRate}</Label>
            <Slider
              value={[filters.minRate]}
              onValueChange={(value) => updateFilter('minRate', value[0])}
              max={50}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>€0</span>
              <span>€50</span>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default BookingRequestFilters;