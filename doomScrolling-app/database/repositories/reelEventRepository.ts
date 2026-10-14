import { getDatabase } from '../index';
import type { ReelEvent } from '@/types/session';

export async function recordReelEvent(
  sessionId: number,
  watchedAt?: string
): Promise<ReelEvent> {
  const db = await getDatabase();
  const timestamp = watchedAt || new Date().toISOString();

  const result = await db.runAsync(
    'INSERT INTO reel_events (session_id, watched_at) VALUES (?, ?);',
    sessionId,
    timestamp
  );

  const event = await db.getFirstAsync<ReelEvent>(
    'SELECT * FROM reel_events WHERE id = ?;',
    result.lastInsertRowId
  );

  if (!event) {
    throw new Error('Failed to retrieve newly created reel event');
  }

  return event;
}

export async function getEventsForSession(sessionId: number): Promise<ReelEvent[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ReelEvent>(
    'SELECT * FROM reel_events WHERE session_id = ? ORDER BY watched_at ASC;',
    sessionId
  );
  return rows;
}

export async function getEventCountForSession(sessionId: number): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM reel_events WHERE session_id = ?;',
    sessionId
  );
  return row?.count ?? 0;
}

export async function getEventsForDateRange(
  startIso: string,
  endIso: string
): Promise<ReelEvent[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ReelEvent>(
    'SELECT * FROM reel_events WHERE watched_at >= ? AND watched_at <= ? ORDER BY watched_at ASC;',
    startIso,
    endIso
  );
  return rows;
}

export async function getEventCountForDateRange(
  startIso: string,
  endIso: string
): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM reel_events WHERE watched_at >= ? AND watched_at <= ?;',
    startIso,
    endIso
  );
  return row?.count ?? 0;
}
