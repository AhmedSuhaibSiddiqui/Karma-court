import { useRef, useEffect } from 'react';
import type { GameState } from '../types/game';

// Custom Hook for render counting
export const useRenderCount = (componentName: string) => {
  const count = useRef(0);
  useEffect(() => {
    count.current++;
    if (import.meta.env.DEV && count.current > 10) {
      console.warn(`[PERF] High re-render count in ${componentName}: ${count.current}`);
    }
  });
};

export class PerformanceService {
  // Pure function for memoized state updates
  static getOptimizedGameState(prev: GameState, next: GameState): GameState {
    if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
    return next;
  }
}
