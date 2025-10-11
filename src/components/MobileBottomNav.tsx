import { NavLink, useLocation } from "react-router-dom";
import { Home, Calendar, User, Heart, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface MobileBottomNavProps {
  userType: "parent" | "sitter";
}

interface BadgeCounts {
  bookings: number;
  requests: number;
  favorites: number;
}

export const MobileBottomNav = ({ userType }: MobileBottomNavProps) => {
  const location = useLocation();
  const { user } = useAuth();
  const [badgeCounts, setBadgeCounts] = useState<BadgeCounts>({
    bookings: 0,
    requests: 0,
    favorites: 0
  });

  // Fetch unread/pending counts
  useEffect(() => {
    if (!user) return;

    const fetchCounts = async () => {
      try {
        if (userType === "parent") {
          // Count pending bookings for parents
          const { count: bookingCount } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .in('status', ['pending', 'awaiting_payment']);

          setBadgeCounts(prev => ({ ...prev, bookings: bookingCount || 0 }));
        } else {
          // Count pending applications for sitters (bookings they need to respond to)
          const { count: requestCount } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

          setBadgeCounts(prev => ({ ...prev, requests: requestCount || 0 }));
        }
      } catch (error) {
        console.error('Error fetching badge counts:', error);
      }
    };

    fetchCounts();

    // Set up real-time subscriptions for updates
    const channel = supabase
      .channel('mobile-nav-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: userType === 'parent' ? `user_id=eq.${user.id}` : undefined
        },
        () => {
          fetchCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userType]);
  
  const parentNavItems = [
    { to: "/", icon: Home, label: "Home", badge: 0 },
    { to: "/parent-dashboard?tab=bookings", icon: Calendar, label: "Bookings", badge: badgeCounts.bookings },
    { to: "/parent-dashboard?tab=favorites", icon: Heart, label: "Favorites", badge: 0 },
    { to: "/parent-dashboard?tab=profile", icon: User, label: "Profile", badge: 0 },
  ];

  const sitterNavItems = [
    { to: "/", icon: Home, label: "Home", badge: 0 },
    { to: "/sitter-dashboard?tab=requests", icon: Calendar, label: "Requests", badge: badgeCounts.requests },
    { to: "/sitter-dashboard?tab=availability", icon: Clock, label: "Schedule", badge: 0 },
    { to: "/sitter-dashboard?tab=profile", icon: User, label: "Profile", badge: 0 },
  ];

  const navItems = userType === "parent" ? parentNavItems : sitterNavItems;

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname + location.search === path || location.pathname.startsWith(path);
  };

  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]"
      aria-label="Mobile navigation"
      role="navigation"
    >
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.to);
          const hasBadge = item.badge > 0;
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-200 min-w-[44px]",
                "active:scale-95",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={`${item.label}${hasBadge ? ` (${item.badge} unread)` : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <div className="relative">
                <Icon className={cn("h-6 w-6 transition-transform", active && "scale-110")} />
                {hasBadge && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-scale-in">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-xs font-medium transition-all",
                active && "font-semibold"
              )}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
