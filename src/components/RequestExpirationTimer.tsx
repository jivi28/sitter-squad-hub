import { useEffect, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RequestExpirationTimerProps {
  expiresAt: string | null;
  status: string;
}

export const RequestExpirationTimer = ({ expiresAt, status }: RequestExpirationTimerProps) => {
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [isCritical, setIsCritical] = useState(false);

  useEffect(() => {
    if (!expiresAt || status !== "pending") return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeRemaining("Expired");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      // Set urgency levels
      setIsCritical(hours < 1);
      setIsUrgent(hours < 6 && hours >= 1);

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m remaining`);
      } else {
        setTimeRemaining(`${minutes}m remaining`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [expiresAt, status]);

  if (!expiresAt || status !== "pending" || !timeRemaining) return null;

  const getVariant = () => {
    if (isCritical) return "destructive";
    if (isUrgent) return "secondary";
    return "outline";
  };

  return (
    <Badge variant={getVariant()} className="flex items-center gap-1">
      {(isUrgent || isCritical) && <AlertTriangle className="h-3 w-3" />}
      <Clock className="h-3 w-3" />
      <span>{timeRemaining}</span>
    </Badge>
  );
};
