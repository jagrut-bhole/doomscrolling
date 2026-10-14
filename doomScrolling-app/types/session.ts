export interface ReelSession {
  id: number;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  reels_count: number;
  created_at: string;
}

export interface ReelEvent {
  id: number;
  session_id: number;
  watched_at: string;
}

export interface CreateSessionInput {
  started_at?: string;
}

export interface CloseSessionInput {
  ended_at?: string;
  duration_seconds: number;
  reels_count: number;
}
