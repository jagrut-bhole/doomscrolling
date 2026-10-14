import { getDatabase } from '../index';
import type { ReelSession } from '@/types/session';

export async function createSession(startedAt?: string): Promise<ReelSession> {
  const db = await getDatabase();
  const startTime = startedAt || new Date().toISOString();
  const now = new Date().toISOString();

  const result = await db.runAsync(
    'INSERT INTO sessions (started_at, ended_at, duration_seconds, reels_count, created_at) VALUES (?, NULL, 0, 0, ?);',
    startTime,
    now
  );

  const session = await db.getFirstAsync<ReelSession>(
    'SELECT * FROM sessions WHERE id = ?;',
    result.lastInsertRowId
  );

  if (!session) {
    throw new Error('Failed to retrieve newly created session');
  }

  return session;
}

export async function getActiveSession(): Promise<ReelSession | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ReelSession>(
    'SELECT * FROM sessions WHERE ended_at IS NULL ORDER BY id DESC LIMIT 1;'
  );
  return row ?? null;
}

export async function getSessionById(id: number): Promise<ReelSession | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ReelSession>(
    'SELECT * FROM sessions WHERE id = ?;',
    id
  );
  return row ?? null;
}

export async function updateSessionProgress(
  sessionId: number,
  durationSeconds: number,
  reelsCount: number
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE sessions SET duration_seconds = ?, reels_count = ? WHERE id = ?;',
    Math.max(0, Math.round(durationSeconds)),
    Math.max(0, Math.round(reelsCount)),
    sessionId
  );
}

export async function closeSession(
  sessionId: number,
  endedAt?: string,
  durationSeconds?: number,
  reelsCount?: number
): Promise<void> {
  const db = await getDatabase();
  const endTime = endedAt || new Date().toISOString();

  if (durationSeconds !== undefined && reelsCount !== undefined) {
    await db.runAsync(
      'UPDATE sessions SET ended_at = ?, duration_seconds = ?, reels_count = ? WHERE id = ?;',
      endTime,
      Math.max(0, Math.round(durationSeconds)),
      Math.max(0, Math.round(reelsCount)),
      sessionId
    );
  } else {
    // If duration not explicitly supplied, calculate from started_at to ended_at
    const existing = await getSessionById(sessionId);
    if (existing) {
      const calculatedDuration = Math.max(
        0,
        Math.floor((new Date(endTime).getTime() - new Date(existing.started_at).getTime()) / 1000)
      );
      await db.runAsync(
        'UPDATE sessions SET ended_at = ?, duration_seconds = ? WHERE id = ?;',
        endTime,
        calculatedDuration,
        sessionId
      );
    } else {
      await db.runAsync(
        'UPDATE sessions SET ended_at = ? WHERE id = ?;',
        endTime,
        sessionId
      );
    }
  }
}

export async function getRecentSessions(limit: number = 20): Promise<ReelSession[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ReelSession>(
    'SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?;',
    limit
  );
  return rows;
}

export async function getSessionsForDateRange(
  startIso: string,
  endIso: string
): Promise<ReelSession[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ReelSession>(
    'SELECT * FROM sessions WHERE started_at >= ? AND started_at <= ? ORDER BY started_at ASC;',
    startIso,
    endIso
  );
  return rows;
}

export async function deleteSession(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM sessions WHERE id = ?;', id);
}
