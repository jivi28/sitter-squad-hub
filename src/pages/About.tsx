import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Heart, Users, Award, CheckCircle, Star } from "lucide-react";
import Header from "@/components/Header";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import CountUp from "react-countup";

const About = () => {
  const [statsRef, statsInView] = useInView({ triggerOnce: true, threshold: 0.1 });

  const stats = [
    { icon: Users, label: "Active Families", value: 30 },
    { icon: Award, label: "Verified Sitters", value: 20 },
    { icon: Star, label: "Average Rating", value: 4.9, decimals: 1 },
    { icon: Heart, label: "Hours of Care", value: 10 }
  ];

  const features = [
    "Background checks for all sitters",
    "Student verification through schools",
    "24/7 customer support",
    "Secure payment processing",
    "Real-time booking system"
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        <section className="py-20 bg-gradient-soft overflow-hidden">
          <div className="container mx-auto px-6">
            <motion.div 
              className="max-w-4xl mx-auto text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.h1 
                className="text-5xl font-bold text-foreground mb-6"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                About BabySit Club
              </motion.h1>
              <motion.p 
                className="text-xl text-muted-foreground leading-relaxed mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                We're revolutionizing childcare by connecting families with trusted student babysitters 
                from local schools and universities. Our mission is to provide safe, reliable, and 
                affordable childcare while helping students earn extra income.
              </motion.p>
              <motion.div 
                className="flex justify-center space-x-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                <Button variant="hero" size="lg" onClick={() => window.location.href = '/parent-signup'}>Join as Parent</Button>
                <Button variant="book" size="lg" onClick={() => window.location.href = '/sitter-auth'}>Become a Sitter</Button>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <h2 className="text-4xl font-bold text-foreground mb-6">
                  Our Story
                </h2>
                <div className="space-y-6 text-muted-foreground leading-relaxed">
                  <p>
                    Founded in 2023 by a group of parents and educators, BabySit Club was born 
                    from the simple need for reliable, trustworthy childcare that fits busy 
                    family schedules.
                  </p>
                  <p>
                    We recognized that many responsible students were looking for flexible 
                    work opportunities, while parents struggled to find reliable babysitters. 
                    Our platform bridges this gap by creating a safe, vetted community.
                  </p>
                  <p>
                    Today, we're proud to serve hundreds of families and provide income 
                    opportunities for students across multiple school districts.
                  </p>
                </div>
              </motion.div>
              
              <motion.div 
                ref={statsRef}
                className="grid grid-cols-2 gap-6"
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                {stats.map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                  >
                    <Card className="text-center p-6 hover-lift">
                      <CardContent className="space-y-3">
                        <div className="w-12 h-12 mx-auto bg-gradient-hero rounded-lg flex items-center justify-center">
                          <stat.icon className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <div className="text-3xl font-bold text-primary">
                          {statsInView && (
                            <CountUp 
                              end={stat.value} 
                              duration={2.5} 
                              decimals={stat.decimals || 0}
                            />
                          )}
                          {stat.label === "Active Families" || stat.label === "Verified Sitters" || stat.label === "Hours of Care" ? "+" : ""}
                        </div>
                        <div className="text-sm text-muted-foreground">{stat.label}</div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted">
          <div className="container mx-auto px-6">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl font-bold text-foreground mb-4">
                What Makes Us Different
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                We go beyond basic babysitting services to ensure safety, quality, and peace of mind
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div 
                  key={index} 
                  className="flex items-center space-x-3"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                >
                  <CheckCircle className="w-6 h-6 text-trust flex-shrink-0" />
                  <span className="text-foreground">{feature}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl font-bold text-foreground mb-6">
                Ready to Get Started?
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join our growing community of families and sitters today
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="hero" size="lg" className="text-lg px-8 py-6" onClick={() => window.location.href = '/parent-signup'}>
                  Find a Sitter
                </Button>
                <Button variant="book" size="lg" className="text-lg px-8 py-6" onClick={() => window.location.href = '/sitter-auth'}>
                  Apply to be a Sitter
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default About;
