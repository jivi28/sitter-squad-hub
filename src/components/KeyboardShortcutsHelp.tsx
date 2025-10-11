import { useState, useEffect } from 'react';
import { Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const KeyboardShortcutsHelp = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+/ to open shortcuts help
      if (e.altKey && e.key === '/') {
        e.preventDefault();
        setOpen(true);
      }
      // Escape to close
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const shortcuts = [
    { keys: 'Alt+H', description: 'Navigate to Home' },
    { keys: 'Alt+D', description: 'Navigate to Dashboard' },
    { keys: 'Alt+B', description: 'Book a Sitter' },
    { keys: 'Alt+P', description: 'View Profile' },
    { keys: 'Alt+/', description: 'Show keyboard shortcuts (this dialog)' },
    { keys: 'Esc', description: 'Close dialogs and menus' },
    { keys: 'Enter', description: 'Submit forms' },
    { keys: 'Tab', description: 'Navigate forward through elements' },
    { keys: 'Shift+Tab', description: 'Navigate backward through elements' },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="fixed bottom-20 right-4 z-40 md:bottom-4 rounded-full shadow-lg hover:shadow-glow"
          aria-label="Keyboard shortcuts help"
        >
          <Keyboard className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md" aria-describedby="keyboard-shortcuts-description">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription id="keyboard-shortcuts-description">
            Use these keyboard shortcuts to navigate the application quickly
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50 hover:bg-muted transition-colors"
            >
              <kbd className="px-2 py-1 text-sm font-semibold text-foreground bg-background border border-border rounded">
                {shortcut.keys}
              </kbd>
              <span className="text-sm text-muted-foreground ml-4 text-right">
                {shortcut.description}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KeyboardShortcutsHelp;
