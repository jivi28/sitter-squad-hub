import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userType, setUserType] = useState<'parent' | 'sitter' | null>(null);
  const { user, signOut } = useAuth();

  // Determine if user is a sitter or parent
  useEffect(() => {
    if (!user) {
      setUserType(null);
      return;
    }

    const checkUserType = async () => {
      try {
        // First priority: Check actual roles from user_roles table (source of truth)
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        const roleSet = new Set(roles?.map(r => r.role) || []);
        
        // If user has explicit sitter role, use it
        if (roleSet.has('sitter')) {
          setUserType('sitter');
          return;
        }
        // If user has explicit parent role, use it
        if (roleSet.has('parent')) {
          setUserType('parent');
          return;
        }

        // Second priority: Check localStorage for signup intent
        const storedRole = localStorage.getItem('user_role');
        if (storedRole === 'sitter' || storedRole === 'parent') {
          setUserType(storedRole);
          return;
        }

        // Third priority: Check which profile exists and is complete
        const { data: sitterData } = await supabase
          .from('sitters')
          .select('id, approved_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (sitterData?.approved_at) {
          setUserType('sitter');
          return;
        }

        // Default to parent
        setUserType('parent');
      } catch (error) {
        console.error('Error checking user type:', error);
        setUserType('parent');
      }
    };

    checkUserType();
  }, [user]);

  const handleMyProfileClick = () => {
    if (userType === 'sitter') {
      window.location.href = '/sitter-signup?edit=true';
    } else {
      window.location.href = '/parent-signup?edit=true';
    }
  };

  const handleLogoClick = () => {
    if (userType === 'sitter') {
      window.location.href = '/sitter-dashboard';
    } else {
      window.location.href = '/';
    }
  };

  return (
    <header className="bg-card border-b border-border shadow-card sticky top-0 z-50" role="banner">
      <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 sm:space-x-2 cursor-pointer" onClick={handleLogoClick}>
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-hero rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-primary-foreground font-bold text-base sm:text-lg">B</span>
            </div>
            <span className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">BabySit Club</span>
          </div>

          <nav className="hidden md:flex items-center space-x-8" role="navigation" aria-label="Main navigation">
            <a 
              href={user && userType === 'parent' ? "/parent-dashboard?tab=book-sitter" : "/#how-it-works"} 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              How it Works
            </a>
            <a href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
              About Us
            </a>
            {user && userType === 'parent' && (
              <a href="/parent-dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                My Bookings
              </a>
            )}
            {user ? (
              <>
                <Button variant="outline" size="sm" onClick={handleMyProfileClick}>
                  My Profile
                </Button>
                <Button variant="outline" size="sm" onClick={signOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => window.location.href = '/auth?role=parent'}>
                  Parent Login
                </Button>
                <Button variant="trust" size="sm" onClick={() => window.location.href = '/auth?role=sitter'}>
                  Sitter Login
                </Button>
              </>
            )}
          </nav>

          <button
            className="md:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95 transition-transform"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-border pt-4 animate-fade-in">
            <nav className="flex flex-col space-y-4">
              <a 
                href={user && userType === 'parent' ? "/parent-dashboard?tab=book-sitter" : "/#how-it-works"} 
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                How it Works
              </a>
              <a href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                About Us
              </a>
              {user && userType === 'parent' && (
                <a href="/parent-dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                  My Bookings
                </a>
              )}
              {user ? (
                <>
                  <Button variant="outline" size="sm" className="self-start" onClick={handleMyProfileClick}>
                    My Profile
                  </Button>
                  <Button variant="outline" size="sm" className="self-start" onClick={signOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" className="self-start" onClick={() => window.location.href = '/auth?role=parent'}>
                    Parent Login
                  </Button>
                  <Button variant="trust" size="sm" className="self-start" onClick={() => window.location.href = '/auth?role=sitter'}>
                    Sitter Login
                  </Button>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;