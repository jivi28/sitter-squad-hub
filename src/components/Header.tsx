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
        // Check if user has sitter profile
        const { data: sitterData } = await supabase
          .from('Sitter profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (sitterData) {
          setUserType('sitter');
          return;
        }

        // Check if user has parent profile  
        const { data: parentData } = await supabase
          .from('Parent profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (parentData) {
          setUserType('parent');
          return;
        }

        // Default to parent if no profile found
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
    <header className="bg-card border-b border-border shadow-card sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={handleLogoClick}>
            <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">B</span>
            </div>
            <span className="text-2xl font-bold text-foreground">BabySit Club</span>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <a href="/#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
              How it Works
            </a>
            <a href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
              About Us
            </a>
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
                <Button variant="outline" size="sm" onClick={() => window.location.href = '/auth'}>
                  Parent Login
                </Button>
                <Button variant="trust" size="sm" onClick={() => window.location.href = '/sitter-signup'}>
                  Become a Sitter
                </Button>
              </>
            )}
          </nav>

          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-border pt-4">
            <nav className="flex flex-col space-y-4">
              <a href="/#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
                How it Works
              </a>
              <a href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                About Us
              </a>
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
                  <Button variant="outline" size="sm" className="self-start" onClick={() => window.location.href = '/auth'}>
                    Parent Login
                  </Button>
                  <Button variant="trust" size="sm" className="self-start" onClick={() => window.location.href = '/sitter-signup'}>
                    Become a Sitter
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