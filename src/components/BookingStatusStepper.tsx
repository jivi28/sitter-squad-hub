import { Check, Clock, UserCheck, CreditCard, CheckCircle, XCircle, Users } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface BookingStatusStepperProps {
  status: string;
  paymentStatus: string;
  responseCount?: number;
}

const statusSteps = [
  {
    key: "pending",
    label: "Request Sent",
    icon: Clock,
    description: "Waiting for sitters to apply",
  },
  {
    key: "received_responses",
    label: "Applications",
    icon: Users,
    description: "Review and select a sitter",
  },
  {
    key: "confirmed",
    label: "Confirmed",
    icon: UserCheck,
    description: "Sitter selected, ready for payment",
  },
  {
    key: "payment",
    label: "Payment",
    icon: CreditCard,
    description: "Complete payment to finalize",
  },
  {
    key: "completed",
    label: "Completed",
    icon: CheckCircle,
    description: "Service completed",
  },
];

export const BookingStatusStepper = ({ status, paymentStatus, responseCount = 0 }: BookingStatusStepperProps) => {
  const getCurrentStepIndex = () => {
    if (status === "cancelled") return -1;
    if (status === "completed") return 4;
    if (paymentStatus === "completed" || status === "completed") return 4;
    if (status === "confirmed" && paymentStatus === "pending") return 3;
    if (status === "confirmed") return 2;
    if (status === "received_responses") return 1;
    return 0;
  };

  const currentStepIndex = getCurrentStepIndex();

  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
        <XCircle className="h-5 w-5 text-destructive" />
        <div>
          <p className="font-semibold text-destructive">Booking Cancelled</p>
          <p className="text-sm text-muted-foreground">This booking has been cancelled</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="w-full">
        <div className="relative">
          {/* Progress Line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted" style={{ zIndex: 0 }} />
          <div
            className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500"
            style={{
              width: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%`,
              zIndex: 0,
            }}
          />

          {/* Steps */}
          <div className="relative flex justify-between" style={{ zIndex: 1 }}>
            {statusSteps.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const isResponseStep = step.key === "received_responses" && responseCount > 0;

              return (
                <Tooltip key={step.key}>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-2 relative">
                      <div
                        className={`
                          w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all
                          ${
                            isCompleted
                              ? "bg-primary border-primary text-primary-foreground"
                              : isCurrent
                              ? "bg-primary/10 border-primary text-primary"
                              : "bg-background border-muted text-muted-foreground"
                          }
                        `}
                      >
                        {isCompleted ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <StepIcon className="h-5 w-5" />
                        )}
                      </div>
                      {isResponseStep && (
                        <Badge
                          variant="default"
                          className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                        >
                          {responseCount}
                        </Badge>
                      )}
                      <div className="text-center hidden sm:block">
                        <p
                          className={`text-xs font-medium ${
                            isCurrent || isCompleted ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {step.label}
                        </p>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">{step.label}</p>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                    {isResponseStep && (
                      <p className="text-sm text-primary font-medium mt-1">
                        {responseCount} sitter{responseCount !== 1 ? "s" : ""} applied
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* Mobile-friendly current status text */}
        <div className="mt-4 sm:hidden text-center">
          <p className="text-sm font-medium text-foreground">
            {statusSteps[currentStepIndex]?.label}
          </p>
          <p className="text-xs text-muted-foreground">
            {statusSteps[currentStepIndex]?.description}
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
};
