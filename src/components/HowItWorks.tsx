import { FileText, Users, CreditCard } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: FileText,
      title: "Submit Request",
      description: "Fill out your babysitting needs and submit your request"
    },
    {
      icon: Users,
      title: "Sitters Respond",
      description: "Available sitters will review and respond to your request"
    },
    {
      icon: CreditCard,
      title: "Confirm & Pay",
      description: "Accept a sitter and complete payment to confirm your booking"
    }
  ];

  return (
    <section id="how-it-works" className="py-12 sm:py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 sm:mb-4">
            How It Works
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Getting reliable childcare is easier than ever with our simple 3-step process
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="text-center group">
              <div className="relative mb-6">
                <div className="w-20 h-20 mx-auto bg-gradient-hero rounded-full flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform duration-300">
                  <step.icon className="w-10 h-10 text-primary-foreground" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-secondary-foreground font-bold text-sm">
                  {index + 1}
                </div>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {step.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 sm:mt-16 text-center">
          <div className="bg-card p-6 sm:p-8 rounded-2xl shadow-card border border-border max-w-4xl mx-auto">
            <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3 sm:mb-4">
              Why Choose BabySit Club?
            </h3>
            <div className="grid sm:grid-cols-3 gap-6 sm:gap-8 mt-6 sm:mt-8">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-primary mb-2">€5-25/hr</div>
                <p className="text-sm sm:text-base text-muted-foreground">Affordable Rates</p>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-trust mb-2">100%</div>
                <p className="text-sm sm:text-base text-muted-foreground">Background Checked</p>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-secondary mb-2">24/7</div>
                <p className="text-sm sm:text-base text-muted-foreground">Support Available</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;