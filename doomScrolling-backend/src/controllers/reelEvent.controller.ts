import type { Request, Response } from "express";
import mongoose from "mongoose";

// utilities
import { asyncHandler } from "@/utils/asyncHandler";
import { responseHandler } from "@/utils/responseHandler";

// mongoose models
import UsageSession from "@/models/usageSession.model";
import ReelEventModel from "@/models/reelEvent.model";

/**
 * Record reel events for a session, supporting single or batch events (POST /api/sessions/:id/events)
 */
export const recordReelEvents = asyncHandler(
  async (request: Request, response: Response) => {
    const userId = request.user?._id;

    if (!userId) {
      return responseHandler.sendError(response, 400, "UserId not found!!");
    }

    const { id } = request.params;
    const sessionId = Array.isArray(id) ? id[0] : id;

    if (!sessionId) {
      return responseHandler.sendError(response, 400, "Session ID is required!!");
    }

    // Locate the session by ObjectId or clientSessionId
    let session = null;
    if (mongoose.Types.ObjectId.isValid(sessionId)) {
      session = await UsageSession.findOne({ _id: sessionId, userId });
    }

    if (!session) {
      session = await UsageSession.findOne({ clientSessionId: sessionId, userId });
    }

    if (!session) {
      return responseHandler.sendError(response, 404, "Session not found!!");
    }

    // Normalize incoming payload to array
    const rawEvents = Array.isArray(request.body)
      ? request.body
      : Array.isArray(request.body?.events)
        ? request.body.events
        : request.body?.clientEventId || request.body?.watchedAt
          ? [request.body]
          : [];

    if (rawEvents.length === 0) {
      return responseHandler.sendError(
        response,
        400,
        "No reel events provided in request body!!",
      );
    }

    const eventsToInsert = rawEvents.map((evt: any, index: number) => ({
      clientEventId:
        evt.clientEventId ||
        `event_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`,
      watchedAt: evt.watchedAt ? new Date(evt.watchedAt) : new Date(),
    }));

    // Idempotent batch insertion using bulkWrite
    const bulkOps = eventsToInsert.map(
      (e: { clientEventId: string; watchedAt: Date }) => ({
        updateOne: {
        filter: { userId, clientEventId: e.clientEventId },
        update: {
          $setOnInsert: {
            userId,
            sessionId: session._id,
            clientEventId: e.clientEventId,
            watchedAt: e.watchedAt,
          },
        },
        upsert: true,
      },
    }));

    const bulkResult = await ReelEventModel.bulkWrite(bulkOps);

    // Update session reels count based on recorded events
    const totalRecordedEvents = await ReelEventModel.countDocuments({
      sessionId: session._id,
      userId,
    });

    session.reelsCount = Math.max(session.reelsCount, totalRecordedEvents);
    await session.save();

    const responsePayload = {
      sessionId: session._id.toString(),
      clientSessionId: session.clientSessionId,
      processedCount: eventsToInsert.length,
      upsertedCount: bulkResult.upsertedCount,
      totalSessionReels: session.reelsCount,
    };

    return responseHandler.sendSuccess(
      response,
      201,
      "Reel events recorded successfully!!",
      responsePayload,
    );
  },
);
