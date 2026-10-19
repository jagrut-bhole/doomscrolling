import { getRecentSessions } from "@/database/repositories/sessionRepository";
import { getEventsForSession } from "@/database/repositories/reelEventRepository";
import { api } from "./apiClient";
import { authStorage } from "./authStorage";

export interface SyncResult {
  success: boolean;
  syncedSessions: number;
  syncedEvents: number;
  syncedAt?: string;
  error?: string;
}

/**
 * Syncs local SQLite sessions and reel events to the MongoDB backend
 */
export async function syncLocalDataToBackend(): Promise<SyncResult> {
  const token = await authStorage.getAccessToken();
  if (!token) {
    return {
      success: false,
      syncedSessions: 0,
      syncedEvents: 0,
      error: "User not authenticated",
    };
  }

  try {
    const localSessions = await getRecentSessions(50);
    if (localSessions.length === 0) {
      return {
        success: true,
        syncedSessions: 0,
        syncedEvents: 0,
      };
    }

    const sessionsPayload = localSessions.map((s) => ({
      clientSessionId: `sqlite_session_${s.id}`,
      startedAt: s.started_at,
      endedAt: s.ended_at,
      durationSeconds: s.duration_seconds || 0,
      reelsCount: s.reels_count || 0,
    }));

    // Collect reel events for each session
    const eventsPayload: {
      clientEventId: string;
      clientSessionId: string;
      watchedAt: string;
    }[] = [];

    for (const s of localSessions) {
      const events = await getEventsForSession(s.id);
      for (const e of events) {
        eventsPayload.push({
          clientEventId: `sqlite_event_${e.id}`,
          clientSessionId: `sqlite_session_${s.id}`,
          watchedAt: e.watched_at,
        });
      }
    }

    const result = await api.sync.syncData({
      sessions: sessionsPayload,
      reelEvents: eventsPayload,
    });

    return {
      success: true,
      syncedSessions: result.syncedSessions,
      syncedEvents: result.syncedEvents,
      syncedAt: result.syncedAt,
    };
  } catch (error: any) {
    console.error("Data sync failed:", error);
    return {
      success: false,
      syncedSessions: 0,
      syncedEvents: 0,
      error: error.message || "Sync failed",
    };
  }
}
