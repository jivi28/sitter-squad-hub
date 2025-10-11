import { FileText, Users, CreditCard } from "lucide-react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import CountUp from "react-countup";

const HowItWorks = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

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

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 50 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <section ref={ref} id="how-it-works" className="py-12 sm:py-16 md:py-20 bg-background" aria-labelledby="how-it-works-heading">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div 
          className="text-center mb-12 sm:mb-16"
          initial={{ opacity: 0, y: -30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 id="how-it-works-heading" className="text-3xl sm:text-4xl font-bold text-foreground mb-3 sm:mb-4">
            How It Works
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Getting reliable childcare is easier than ever with our simple 3-step process
          </p>
        </motion.div>

        <motion.div 
          className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto relative"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {/* Connecting lines for desktop */}
          <div className="hidden md:block absolute top-10 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-secondary to-trust opacity-30" style={{ width: '85%', left: '7.5%' }}></div>
          
          {steps.map((step, index) => (
            <motion.div 
              key={index} 
              className="text-center group relative z-10"
              variants={item}
              role="article"
              aria-label={`Step ${index + 1}: ${step.title}`}
            >
              <div className="relative mb-6">
                <motion.div 
                  className="w-20 h-20 mx-auto bg-gradient-hero rounded-full flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform duration-300"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <step.icon className="w-10 h-10 text-primary-foreground" />
                </motion.div>
                <motion.div 
                  className="absolute -top-2 -right-2 w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-secondary-foreground font-bold text-sm shadow-md"
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + (index * 0.2), type: "spring", stiffness: 200 }}
                >
                  {index + 1}
                </motion.div>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {step.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div 
          ref={ref}
          className="mt-12 sm:mt-16 text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <div className="bg-card p-6 sm:p-8 rounded-2xl shadow-card border border-border max-w-4xl mx-auto hover-lift">
            <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3 sm:mb-4">
              Why Choose BabySit Club?
            </h3>
            <div className="grid sm:grid-cols-3 gap-6 sm:gap-8 mt-6 sm:mt-8">
              <motion.div 
                className="text-center"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
              >
                <div className="text-2xl sm:text-3xl font-bold text-primary mb-2">
                  €{inView && <CountUp end={5} duration={2} />}-{inView && <CountUp end={25} duration={2} />}/hr
                </div>
                <p className="text-sm sm:text-base text-muted-foreground">Affordable Rates</p>
              </motion.div>
              <motion.div 
                className="text-center"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 }}
              >
                <div className="text-2xl sm:text-3xl font-bold text-trust mb-2">
                  {inView && <CountUp end={100} duration={2} />}%
                </div>
                <p className="text-sm sm:text-base text-muted-foreground">Background Checked</p>
              </motion.div>
              <motion.div 
                className="text-center"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.7 }}
              >
                <div className="text-2xl sm:text-3xl font-bold text-secondary mb-2">24/7</div>
                <p className="text-sm sm:text-base text-muted-foreground">Support Available</p>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
