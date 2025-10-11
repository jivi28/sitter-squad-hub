import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Calendar, Users, CreditCard, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ParentOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps = [
  {
    icon: Calendar,
    title: "1. Create a Booking Request",
    description: "Tell us when you need a sitter, how many children, and any special requirements.",
    color: "text-blue-500",
  },
  {
    icon: Users,
    title: "2. Review Sitter Applications",
    description: "Qualified sitters will apply. Review their profiles, experience, and rates.",
    color: "text-purple-500",
  },
  {
    icon: Check,
    title: "3. Select Your Sitter",
    description: "Choose the sitter that best fits your needs and preferences.",
    color: "text-green-500",
  },
  {
    icon: CreditCard,
    title: "4. Complete Payment",
    description: "Secure payment through Stripe. Your booking is confirmed!",
    color: "text-orange-500",
  },
];

export const ParentOnboardingModal = ({ isOpen, onClose }: ParentOnboardingModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Welcome to BabySitHub! 👋</DialogTitle>
          <DialogDescription className="text-base">
            Let's walk you through how to find the perfect sitter for your family
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress Dots */}
          <div className="flex justify-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-all ${
                  index === currentStep
                    ? "bg-primary w-8"
                    : index < currentStep
                    ? "bg-primary/50"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Current Step Content */}
          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div
                  className={`w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center ${steps[currentStep].color}`}
                >
                  {(() => {
                    const StepIcon = steps[currentStep].icon;
                    return <StepIcon className="h-8 w-8" />;
                  })()}
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">{steps[currentStep].title}</h3>
                  <p className="text-muted-foreground">{steps[currentStep].description}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* All Steps Preview */}
          <div className="grid grid-cols-2 gap-3">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              return (
                <div
                  key={index}
                  className={`p-3 rounded-lg border transition-all ${
                    index === currentStep
                      ? "border-primary bg-primary/5"
                      : index < currentStep
                      ? "border-primary/30 bg-muted/50"
                      : "border-muted"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <StepIcon className={`h-4 w-4 ${step.color}`} />
                    <span
                      className={`text-sm font-medium ${
                        index <= currentStep ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSkip} className="flex-1">
              Skip Tutorial
            </Button>
            <Button onClick={handleNext} className="flex-1">
              {currentStep < steps.length - 1 ? (
                <>
                  Next <ArrowRight className="h-4 w-4 ml-2" />
                </>
              ) : (
                "Get Started"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
