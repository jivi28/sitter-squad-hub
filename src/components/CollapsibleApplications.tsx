import { useState } from "react";
import { ChevronDown, ChevronUp, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import SitterApplications from "./SitterApplications";

interface CollapsibleApplicationsProps {
  bookingId: string;
  responseCount: number;
  onSitterSelected: () => void;
  defaultExpanded?: boolean;
}

export const CollapsibleApplications = ({
  bookingId,
  responseCount,
  onSitterSelected,
  defaultExpanded = true,
}: CollapsibleApplicationsProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (responseCount === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-0">
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-transparent"
        >
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary animate-pulse" />
            <span className="font-semibold text-foreground">
              New Sitter Applications
            </span>
            <Badge variant="default" className="ml-2">
              {responseCount} {responseCount === 1 ? "sitter" : "sitters"}
            </Badge>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </Button>

        {isExpanded && (
          <div className="px-4 pb-4">
            <SitterApplications
              bookingId={bookingId}
              onSitterSelected={onSitterSelected}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
