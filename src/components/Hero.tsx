import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Star, Shield, Users } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { detectUserRole, UserRoles } from "@/utils/roleDetection";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import CountUp from "react-countup";

const Hero = () => {
  const { user } = useAuth();
  const [hasCompleteProfile, setHasCompleteProfile] = useState(false);
  const [userRoles, setUserRoles] = useState<UserRoles>({ isParent: false, isSitter: false, hasBothRoles: false });
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  useEffect(() => {
    const checkProfile = async () => {
      if (!user) return;

      const roles = await detectUserRole(user.id);
      setUserRoles(roles);
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const isComplete = !!(
            data.first_name &&
            data.last_name &&
            data.phone &&
            data.address &&
            data.num_children &&
            data.children_ages
          );
          setHasCompleteProfile(isComplete);
        }
      } catch (error) {
        console.error('Error checking profile:', error);
      }
    };

    checkProfile();
  }, [user]);

  const getSmartRedirect = async (userId: string): Promise<string> => {
    try {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bookings:', error);
        return '/parent-dashboard?tab=book-sitter';
      }

      if (!bookings || bookings.length === 0) {
        return '/parent-dashboard?tab=book-sitter';
      }

      const hasActiveBookings = bookings.some(booking => 
        booking.status === 'pending' || 
        booking.status === 'confirmed' || 
        booking.payment_status === 'pending'
      );

      if (hasActiveBookings) {
        return '/parent-dashboard?tab=bookings';
      }

      return '/parent-dashboard?tab=book-sitter';
    } catch (error) {
      console.error('Error in smart redirect:', error);
      return '/parent-dashboard?tab=book-sitter';
    }
  };

  const handleFindSitterClick = async () => {
    if (user && hasCompleteProfile) {
      const redirectUrl = await getSmartRedirect(user.id);
      window.location.href = redirectUrl;
    } else {
      window.location.href = '/parent-signup';
    }
  };

  return (
    <section className="bg-gradient-soft py-12 sm:py-16 md:py-20 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
          <motion.div 
            className="space-y-6 sm:space-y-8"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="space-y-3 sm:space-y-4">
              <motion.h1 
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                Trusted School-Based 
                <span className="text-primary"> Babysitters</span>
              </motion.h1>
              <motion.p 
                className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                Connect with verified student sitters from your local schools. Safe, reliable, and affordable childcare when you need it most.
              </motion.p>
            </div>

            <motion.div 
              className="flex flex-col sm:flex-row gap-3 sm:gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              {user ? (
                <>
                  {userRoles.isSitter && !userRoles.isParent && (
                    <Button variant="hero" size="lg" className="text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 w-full sm:w-auto" onClick={() => window.location.href = '/sitter-dashboard'}>
                      View Dashboard
                    </Button>
                  )}
                  {(userRoles.isParent || userRoles.hasBothRoles) && (
                    <Button variant="hero" size="lg" className="text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 w-full sm:w-auto" onClick={handleFindSitterClick}>
                      Find a Sitter Now
                    </Button>
                  )}
                  {userRoles.hasBothRoles && (
                    <Button variant="book" size="lg" className="text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 w-full sm:w-auto" onClick={() => window.location.href = '/sitter-dashboard'}>
                      Sitter Dashboard
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button variant="hero" size="lg" className="text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 w-full sm:w-auto" onClick={() => window.location.href = '/auth?role=parent'}>
                    Sign In to Book
                  </Button>
                  <Button variant="book" size="lg" className="text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 w-full sm:w-auto" onClick={() => window.location.href = '/auth?role=sitter'}>
                    Become a Sitter
                  </Button>
                </>
              )}
            </motion.div>

            <motion.div 
              ref={ref}
              className="flex flex-wrap items-center gap-3 sm:gap-4 md:gap-6 lg:gap-8 pt-2 sm:pt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <div className="flex space-x-0.5 sm:space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1 + (i * 0.1), duration: 0.3 }}
                    >
                      <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-secondary text-secondary" />
                    </motion.div>
                  ))}
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                  {inView && <CountUp end={4.9} decimals={1} duration={2} />}/5 Rating
                </span>
              </div>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-trust animate-pulse-glow" />
                <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Verified Sitters</span>
              </div>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                  {inView && <CountUp end={30} duration={2} />}+ Families
                </span>
              </div>
            </motion.div>
          </motion.div>

          <motion.div 
            className="relative"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
          >
            <div className="relative overflow-hidden rounded-2xl shadow-card hover-lift">
              <img 
                src={heroImage} 
                alt="Happy family with children enjoying safe childcare" 
                className="w-full h-auto object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent"></div>
            </div>
            
            <motion.div 
              className="absolute -bottom-6 -left-6 bg-card p-6 rounded-xl shadow-card border border-border"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2, duration: 0.5, type: "spring" }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-trust rounded-full flex items-center justify-center animate-pulse-glow">
                  <Shield className="w-6 h-6 text-trust-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">100% Verified</p>
                  <p className="text-sm text-muted-foreground">Background Checked</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
