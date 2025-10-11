import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const useKeyboardShortcuts = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger shortcuts with Alt key
      if (!event.altKey) return;
      
      // Prevent default for our shortcuts
      const shortcuts: { [key: string]: () => void } = {
        'b': () => {
          // Alt+B: Book a sitter (go to booking page)
          event.preventDefault();
          if (location.pathname === '/parent-dashboard') {
            // If already on dashboard, scroll to booking form
            window.location.href = '/parent-dashboard?tab=book-sitter';
          } else {
            navigate('/parent-dashboard?tab=book-sitter');
          }
        },
        'd': () => {
          // Alt+D: Dashboard
          event.preventDefault();
          if (location.pathname.includes('sitter')) {
            navigate('/sitter-dashboard');
          } else {
            navigate('/parent-dashboard');
          }
        },
        'h': () => {
          // Alt+H: Home
          event.preventDefault();
          navigate('/');
        },
        'p': () => {
          // Alt+P: Profile
          event.preventDefault();
          if (location.pathname.includes('sitter')) {
            navigate('/sitter-dashboard?tab=profile');
          } else {
            navigate('/parent-dashboard?tab=profile');
          }
        },
        '/': () => {
          // Alt+/: Show keyboard shortcuts help
          event.preventDefault();
          alert(
            'Keyboard Shortcuts:\n\n' +
            'Alt+H - Home\n' +
            'Alt+D - Dashboard\n' +
            'Alt+B - Book a Sitter\n' +
            'Alt+P - Profile\n' +
            'Alt+/ - Show this help\n' +
            'Esc - Close dialogs/menus\n' +
            'Enter - Submit forms\n' +
            'Tab/Shift+Tab - Navigate'
          );
        }
      };

      const handler = shortcuts[event.key.toLowerCase()];
      if (handler) {
        handler();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate, location]);
};
