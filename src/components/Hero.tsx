import { Button } from "@/components/ui/button";
import { Star, Shield, Users } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

const Hero = () => {
  return (
    <section className="bg-gradient-soft py-20">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Trusted School-Based 
                <span className="text-primary"> Babysitters</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Connect with verified student sitters from your local schools. Safe, reliable, and affordable childcare when you need it most.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hero" size="lg" className="text-lg px-8 py-6" onClick={() => window.location.href = '/parent-signup'}>
                Find a Sitter Now
              </Button>
              <Button variant="book" size="lg" className="text-lg px-8 py-6" onClick={() => window.location.href = '/sitter-signup'}>
                Become a Sitter
              </Button>
            </div>

            <div className="flex items-center space-x-8 pt-4">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-secondary text-secondary" />
                  ))}
                </div>
                <span className="text-muted-foreground">4.9/5 Rating</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-trust" />
                <span className="text-muted-foreground">Verified Sitters</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-muted-foreground">500+ Families</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="relative overflow-hidden rounded-2xl shadow-card">
              <img 
                src={heroImage} 
                alt="Happy family with children enjoying safe childcare" 
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent"></div>
            </div>
            
            <div className="absolute -bottom-6 -left-6 bg-card p-6 rounded-xl shadow-card border border-border">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-trust rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6 text-trust-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">100% Verified</p>
                  <p className="text-sm text-muted-foreground">Background Checked</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;