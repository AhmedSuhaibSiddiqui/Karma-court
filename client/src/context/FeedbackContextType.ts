import { createContext } from 'react';

export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface FeedbackContextType {
  showToast: (message: string, type?: ToastType) => void;
  showError: (error: unknown) => void;
}

export const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);
