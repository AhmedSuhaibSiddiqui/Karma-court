export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string | null;
  global_name?: string | null;
}

export interface Evidence {
  id: number;
  text: string;
  author: string;
}

export interface LogEntry {
  message: string;
  type: string;
}

export interface GameState {
  votes: { guilty: number; innocent: number };
  voters: string[];
  crime: string;
  verdict: 'guilty' | 'innocent' | null;
  sentence: string | null;
  judge_id: string | null;
  accused: { username: string; avatar: string | null };
  witness: { username: string | null; avatar: string | null };
  timer: number;
  evidence: Evidence[];
  logs: LogEntry[];
}
