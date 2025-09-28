import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface School {
  id: string;
  name: string;
  short_name: string | null;
}

interface MobileSchoolSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  required?: boolean;
  label?: string;
}

export const MobileSchoolSelect: React.FC<MobileSchoolSelectProps> = ({
  value,
  onValueChange,
  placeholder = "Type to search schools or enter custom",
  className,
  id,
  required = false,
  label
}) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const { data, error } = await supabase
          .from('schools')
          .select('id, name, short_name')
          .order('name');
        
        if (error) throw error;
        setSchools(data || []);
      } catch (error) {
        console.error('Error fetching schools:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchools();
  }, []);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  const filteredSchools = schools.filter(school => 
    searchTerm.length >= 2 && (
      school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (school.short_name && school.short_name.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  ).slice(0, 5); // Limit to 5 suggestions for mobile

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onValueChange(newValue);
    setShowSuggestions(newValue.length >= 2);
    setSelectedIndex(-1);
  };

  const handleInputFocus = () => {
    if (searchTerm.length >= 2) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow for selection
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleSuggestionSelect = (schoolName: string) => {
    setSearchTerm(schoolName);
    onValueChange(schoolName);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || filteredSchools.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredSchools.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredSchools.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionSelect(filteredSchools[selectedIndex].name);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleClear = () => {
    setSearchTerm("");
    onValueChange("");
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  return (
    <div className={cn("space-y-2 relative", className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id={id}
            type="text"
            placeholder={placeholder}
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            className="pl-10 pr-10 h-11"
            required={required}
            autoComplete="organization"
          />
          {searchTerm && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {showSuggestions && filteredSchools.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
            {filteredSchools.map((school, index) => (
              <button
                key={school.id}
                type="button"
                className={cn(
                  "w-full text-left px-4 py-3 hover:bg-muted focus:bg-muted focus:outline-none transition-colors",
                  index === selectedIndex && "bg-muted"
                )}
                onClick={() => handleSuggestionSelect(school.name)}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{school.name}</span>
                  {school.short_name && (
                    <span className="text-xs text-muted-foreground">({school.short_name})</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {searchTerm.length >= 2 && filteredSchools.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground">
          No schools found. You can still enter "{searchTerm}" as your custom school.
        </p>
      )}
      
      {searchTerm.length < 2 && (
        <p className="text-sm text-muted-foreground">
          Type at least 2 characters to search schools, or enter your school name directly.
        </p>
      )}
    </div>
  );
};