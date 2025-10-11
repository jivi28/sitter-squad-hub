import { NavLink, useLocation } from "react-router-dom";
import { Home, Calendar, User, Heart, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  userType: "parent" | "sitter";
}

export const MobileBottomNav = ({ userType }: MobileBottomNavProps) => {
  const location = useLocation();
  
  const parentNavItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/parent-dashboard?tab=bookings", icon: Calendar, label: "Bookings" },
    { to: "/parent-dashboard?tab=favorites", icon: Heart, label: "Favorites" },
    { to: "/parent-dashboard?tab=profile", icon: User, label: "Profile" },
  ];

  const sitterNavItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/sitter-dashboard?tab=requests", icon: Calendar, label: "Requests" },
    { to: "/sitter-dashboard?tab=availability", icon: Clock, label: "Schedule" },
    { to: "/sitter-dashboard?tab=profile", icon: User, label: "Profile" },
  ];

  const navItems = userType === "parent" ? parentNavItems : sitterNavItems;

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname + location.search === path || location.pathname.startsWith(path);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50 animate-slide-in-up">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.to);
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "animate-scale-in")} />
              <span className="text-xs font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
