# Accessibility Features

This application is built to meet WCAG 2.1 AA accessibility standards.

## Screen Reader Support

- **ARIA Labels**: All interactive elements have appropriate `aria-label` attributes
- **Skip to Content**: Users can skip directly to main content by pressing Tab on page load
- **Semantic HTML**: Proper heading hierarchy (h1→h2→h3) throughout the application
- **Focus Management**: Modal dialogs trap focus and return focus on close
- **Landmark Regions**: Proper use of `<main>`, `<nav>`, `<header>` elements

## Keyboard Navigation

### Keyboard Shortcuts

- **Alt+H** - Navigate to Home
- **Alt+D** - Navigate to Dashboard
- **Alt+B** - Navigate to Book a Sitter
- **Alt+P** - Navigate to Profile
- **Alt+/** - Show keyboard shortcuts help
- **Esc** - Close open modals/dialogs
- **Enter** - Submit forms
- **Tab/Shift+Tab** - Navigate through interactive elements

### Tab Navigation

- Logical tab order throughout the application
- Visible focus indicators on all interactive elements
- Skip navigation link for keyboard users

## Visual Accessibility

### Color Contrast

- All text meets WCAG AA contrast ratio requirements (4.5:1 for normal text, 3:1 for large text)
- Focus indicators use high-contrast colors for visibility
- Dark mode fully supported with appropriate contrast

### Focus Indicators

- Enhanced 3px focus outline on all interactive elements
- High-contrast focus rings visible in both light and dark modes
- Keyboard navigation mode provides additional visual feedback

### Responsive Design

- Supports up to 200% zoom without breaking layout
- Minimum touch target size of 44x44 pixels for mobile
- Fluid typography that scales appropriately

## Reduced Motion

The application respects the `prefers-reduced-motion` media query:

```css
@media (prefers-reduced-motion: reduce) {
  /* Animations are reduced to minimal duration */
}
```

Users who have enabled reduced motion in their system preferences will experience:
- Instant transitions instead of animations
- No parallax effects
- Immediate scrolling behavior

## Form Accessibility

- All form inputs have associated labels
- Error messages are announced to screen readers
- Appropriate input types for mobile keyboards (tel, email, number)
- Required fields clearly marked

## Mobile Accessibility

- Touch targets meet minimum 44x44 pixel size
- Badge notifications for important updates
- Proper ARIA labels on mobile navigation
- Swipe gestures do not interfere with screen reader gestures

## Testing

To test accessibility:

1. **Keyboard Navigation**: Try navigating the entire app using only Tab, Shift+Tab, Enter, and Esc
2. **Screen Reader**: Test with NVDA (Windows), JAWS (Windows), or VoiceOver (Mac/iOS)
3. **Color Contrast**: Use browser DevTools or online contrast checkers
4. **Zoom**: Test at 200% browser zoom
5. **Reduced Motion**: Enable in OS settings and verify animations are minimal

## Known Issues

None at this time. Please report accessibility issues via GitHub issues.

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Keyboard Accessibility Guide](https://webaim.org/techniques/keyboard/)
