/**
 * Represents a user from the Discord Embedded App SDK.
 */
export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string | null;
  global_name?: string | null;
}

/**
 * Represents a piece of evidence submitted to the court.
 */
export interface Evidence {
  id: number;
  text: string;
  author: string;
}

/**
 * Represents a log entry in the court record (terminal).
 */
export interface LogEntry {
  message: string;
  /**
   * The category of the log, used for styling and filtering.
   * - 'system': General system notifications.
   * - 'alert': Critical alerts (e.g., crimes, severe sentences).
   * - 'verdict': The final judgment.
   * - 'info': General information.
   * - 'objection': Objection events.
   * - 'evidence': Evidence submissions.
   */
  type: 'system' | 'alert' | 'verdict' | 'info' | 'objection' | 'evidence';
}

/**
 * Tracks the current vote count.
 */
export interface VoteCount {
  guilty: number;
  innocent: number;
}

/**
 * The complete state of the game, synchronized via WebSockets.
 */
export interface GameState {
  /** Current vote counts for Guilty vs Innocent. */
  votes: VoteCount;
  /** List of user IDs who have already voted. */
  voters: string[];
  /** The specific accusation or 'crime' being judged. */
  crime: string;
  /** The final outcome of the trial. */
  verdict: 'guilty' | 'innocent' | null;
  /** The punishment text if the verdict is guilty. */
  sentence: string | null;
  /** The User ID of the current Judge. */
  judge_id: string | null;
  /** Details of the user being put on trial. */
  accused: { username: string; avatar: string | null };
  /** Details of the witness currently on the stand. */
  witness: { username: string | null; avatar: string | null };
  /** Time remaining for the current phase (in seconds). */
  timer: number;
  /** List of active evidence cards. */
  evidence: Evidence[];
  /** History of court actions for the terminal log. */
  logs: LogEntry[];
}
