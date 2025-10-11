import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

interface ExtendRequestButtonProps {
  bookingId: string;
  extensionCount: number;
  onExtend: (bookingId: string, extensionCount: number) => void;
}

export const ExtendRequestButton = ({ bookingId, extensionCount, onExtend }: ExtendRequestButtonProps) => {
  const remainingExtensions = 2 - extensionCount;

  if (remainingExtensions <= 0) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => onExtend(bookingId, extensionCount)}
    >
      <Clock className="h-4 w-4 mr-2" />
      Extend Request (+12h) ({remainingExtensions} left)
    </Button>
  );
};
