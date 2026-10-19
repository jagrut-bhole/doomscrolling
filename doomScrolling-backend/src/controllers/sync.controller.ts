import type { Request, Response } from "express";

// utilities
import { asyncHandler } from "@/utils/asyncHandler";
import { responseHandler } from "@/utils/responseHandler";

// mongoose models
import UsageSession from "@/models/usageSession.model";
import ReelEventModel from "@/models/reelEvent.model";

interface SyncSessionInput {
  clientSessionId: string;
  startedAt: string;
  endedAt?: string | null;
  durationSeconds?: number;
  reelsCount?: number;
}

interface SyncReelEventInput {
  clientEventId: string;
  clientSessionId: string;
  watchedAt: string;
}

/**
 * Reconcile local SQLite sessions and events with MongoDB (POST /api/sync)
 */
export const syncData = asyncHandler(
  async (request: Request, response: Response) => {
    const userId = request.user?._id;

    if (!userId) {
      return responseHandler.sendError(response, 400, "UserId not found!!");
    }

    const { sessions = [], reelEvents = [] } = (request.body || {}) as {
      sessions?: SyncSessionInput[];
      reelEvents?: SyncReelEventInput[];
    };

    let syncedSessionsCount = 0;
    const sessionMap = new Map<string, any>();

    // 1. Reconcile Sessions
    for (const localSession of sessions) {
      if (!localSession.clientSessionId) continue;

      let session = await UsageSession.findOne({
        userId,
        clientSessionId: localSession.clientSessionId,
      });

      if (session) {
        // Reconcile with local data (taking latest/max progress)
        let changed = false;

        if (localSession.endedAt && !session.endedAt) {
          session.endedAt = new Date(localSession.endedAt);
          changed = true;
        }

        const maxDuration = Math.max(
          session.durationSeconds || 0,
          Number(localSession.durationSeconds) || 0,
        );
        if (maxDuration > session.durationSeconds) {
          session.durationSeconds = maxDuration;
          changed = true;
        }

        const maxReels = Math.max(
          session.reelsCount || 0,
          Number(localSession.reelsCount) || 0,
        );
        if (maxReels > session.reelsCount) {
          session.reelsCount = maxReels;
          changed = true;
        }

        if (changed) {
          await session.save();
        }
      } else {
        // Create new session
        session = await UsageSession.create({
          userId,
          clientSessionId: localSession.clientSessionId,
          startedAt: localSession.startedAt
            ? new Date(localSession.startedAt)
            : new Date(),
          endedAt: localSession.endedAt
            ? new Date(localSession.endedAt)
            : (null as any),
          durationSeconds: Number(localSession.durationSeconds) || 0,
          reelsCount: Number(localSession.reelsCount) || 0,
        });
      }

      sessionMap.set(localSession.clientSessionId, session);
      syncedSessionsCount++;
    }

    // 2. Reconcile Reel Events
    let syncedEventsCount = 0;
    if (reelEvents.length > 0) {
      const bulkOps: any[] = [];

      for (const event of reelEvents) {
        if (!event.clientEventId || !event.clientSessionId) continue;

        let session = sessionMap.get(event.clientSessionId);
        if (!session) {
          session = await UsageSession.findOne({
            userId,
            clientSessionId: event.clientSessionId,
          });
          if (session) {
            sessionMap.set(event.clientSessionId, session);
          }
        }

        if (session) {
          bulkOps.push({
            updateOne: {
              filter: { userId, clientEventId: event.clientEventId },
              update: {
                $setOnInsert: {
                  userId,
                  sessionId: session._id,
                  clientEventId: event.clientEventId,
                  watchedAt: event.watchedAt
                    ? new Date(event.watchedAt)
                    : new Date(),
                },
              },
              upsert: true,
            },
          });
        }
      }

      if (bulkOps.length > 0) {
        const result = await ReelEventModel.bulkWrite(bulkOps);
        syncedEventsCount = result.upsertedCount + result.modifiedCount;
      }
    }

    // 3. Final count reconciliation for affected sessions
    for (const session of sessionMap.values()) {
      const count = await ReelEventModel.countDocuments({
        sessionId: session._id,
        userId,
      });
      if (count > session.reelsCount) {
        session.reelsCount = count;
        await session.save();
      }
    }

    const syncSummary = {
      syncedSessions: syncedSessionsCount,
      syncedEvents: syncedEventsCount,
      syncedAt: new Date().toISOString(),
    };

    return responseHandler.sendSuccess(
      response,
      200,
      "Data reconciled successfully!!",
      syncSummary,
    );
  },
);
