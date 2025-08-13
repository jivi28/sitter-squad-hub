import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-card border-b border-border shadow-card sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">B</span>
            </div>
            <span className="text-2xl font-bold text-foreground">BabySit Club</span>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
              How it Works
            </a>
            <a href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
              About Us
            </a>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/parent-signup'}>
              Parent Login
            </Button>
            <Button variant="trust" size="sm" onClick={() => window.location.href = '/sitter-signup'}>
              Become a Sitter
            </Button>
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
              <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
                How it Works
              </a>
              <a href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                About Us
              </a>
              <Button variant="outline" size="sm" className="self-start" onClick={() => window.location.href = '/parent-signup'}>
                Parent Login
              </Button>
              <Button variant="trust" size="sm" className="self-start" onClick={() => window.location.href = '/sitter-signup'}>
                Become a Sitter
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;