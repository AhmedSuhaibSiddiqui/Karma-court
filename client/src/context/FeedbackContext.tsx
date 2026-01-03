import React, { useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FeedbackContext } from './FeedbackContextType';
import type { ToastType } from './FeedbackContextType';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export const FeedbackProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const showError = useCallback((error: unknown) => {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    showToast(message, 'error');
  }, [showToast]);

  return (
    <FeedbackContext.Provider value={{ showToast, showError }}>
      {children}
      <div className="toast-container">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              className={`toast toast-${toast.type}`}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
            >
              <div className="toast-icon">{toast.type === 'error' ? '🚫' : '📡'}</div>
              <div className="toast-message">{toast.message}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </FeedbackContext.Provider>
  );
};