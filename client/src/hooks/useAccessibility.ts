import { useEffect } from 'react';

export const useAccessibility = () => {
  useEffect(() => {
    // Add global keyboard listeners if needed (e.g. Esc to close modals)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Broadcast a custom event that components can listen to
        window.dispatchEvent(new CustomEvent('close-modals'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Helper to generate standard ARIA props
  const getButtonAria = (label: string, disabled: boolean = false) => ({
    'aria-label': label,
    'aria-disabled': disabled,
    role: 'button',
    tabIndex: disabled ? -1 : 0,
  });

  return { getButtonAria };
};
