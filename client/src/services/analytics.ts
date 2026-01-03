type EventType = 'game_start' | 'vote_cast' | 'objection_called' | 'evidence_added' | 'verdict_delivered';

export class Analytics {
  static trackEvent(event: EventType, metadata: Record<string, unknown> = {}) {
    // Log to console in dev mode
    console.log(`[ANALYTICS] Event: ${event}`, metadata);

    // Placeholder for production analytics integration (e.g. Google Analytics / PostHog)
    if (import.meta.env.PROD) {
      // Example: window.gtag('event', event, metadata);
    }
  }

  static trackError(error: unknown, context: string) {
    console.error(`[ANALYTICS ERROR] Context: ${context}`, error);
  }
}