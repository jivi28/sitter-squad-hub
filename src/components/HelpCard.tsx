import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Lightbulb } from "lucide-react";

interface HelpCardProps {
  title: string;
  description: string;
  tips: string[];
  storageKey: string;
}

export const HelpCard = ({ title, description, tips, storageKey }: HelpCardProps) => {
  const [isVisible, setIsVisible] = useState(() => {
    return !localStorage.getItem(storageKey);
  });

  const handleDismiss = () => {
    localStorage.setItem(storageKey, "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <Card className="border-primary/20 bg-primary/5 animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 hover:bg-primary/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {tips.map((tip, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <span className="text-primary font-bold mt-0.5">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
