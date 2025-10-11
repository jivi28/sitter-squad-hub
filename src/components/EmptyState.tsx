import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  tips?: string[];
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  tips,
}: EmptyStateProps) => {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <Icon className="h-16 w-16 mx-auto mb-4 text-muted-foreground animate-fade-in" />
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">{description}</p>
        
        {tips && tips.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-4 mb-6 max-w-md mx-auto text-left">
            <p className="font-medium text-sm mb-2">💡 Getting Started:</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {actionLabel && onAction && (
          <Button onClick={onAction} size="lg" className="hover-scale">
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
