import type { Request, Response } from "express";
import mongoose from "mongoose";

// utilities
import { asyncHandler } from "@/utils/asyncHandler";
import { responseHandler } from "@/utils/responseHandler";

// mongoose models
import UsageSession from "@/models/usageSession.model";
import ReelEventModel from "@/models/reelEvent.model";

/**
 * Start a new usage session (POST /api/sessions)
 */
export const createSession = asyncHandler(
  async (request: Request, response: Response) => {
    const userId = request.user?._id;

    if (!userId) {
      return responseHandler.sendError(response, 400, "UserId not found!!");
    }

    const { clientSessionId, startedAt } = request.body || {};

    const finalClientSessionId =
      clientSessionId ||
      `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const startTime = startedAt ? new Date(startedAt) : new Date();

    // Check if session with this clientSessionId already exists for this user (idempotency)
    let session = await UsageSession.findOne({
      userId,
      clientSessionId: finalClientSessionId,
    });

    if (session) {
      return responseHandler.sendSuccess(
        response,
        200,
        "Session already exists",
        {
          id: session._id.toString(),
          clientSessionId: session.clientSessionId,
          startedAt: session.startedAt,
          endedAt: session.endedAt ?? null,
          durationSeconds: session.durationSeconds,
          reelsCount: session.reelsCount,
          createdAt: session.createdAt,
        },
      );
    }

    const newSession = await UsageSession.create({
      userId,
      clientSessionId: finalClientSessionId,
      startedAt: startTime,
      endedAt: null as any,
      durationSeconds: 0,
      reelsCount: 0,
    });

    const sessionData = {
      id: newSession._id.toString(),
      clientSessionId: newSession.clientSessionId,
      startedAt: newSession.startedAt,
      endedAt: newSession.endedAt ?? null,
      durationSeconds: newSession.durationSeconds,
      reelsCount: newSession.reelsCount,
      createdAt: newSession.createdAt,
    };

    return responseHandler.sendSuccess(
      response,
      201,
      "Session started successfully!!",
      sessionData,
    );
  },
);

/**
 * Finish / End a session (PATCH /api/sessions/:id/end)
 */
export const endSession = asyncHandler(
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

    const { endedAt, durationSeconds, reelsCount } = request.body || {};

    const endTime = endedAt ? new Date(endedAt) : new Date();
    session.endedAt = endTime;

    if (durationSeconds !== undefined) {
      session.durationSeconds = Math.max(0, Math.round(Number(durationSeconds)));
    } else {
      const calculatedDuration = Math.max(
        0,
        Math.floor((endTime.getTime() - new Date(session.startedAt).getTime()) / 1000),
      );
      session.durationSeconds = calculatedDuration;
    }

    if (reelsCount !== undefined) {
      session.reelsCount = Math.max(0, Math.round(Number(reelsCount)));
    } else {
      const recordedEventsCount = await ReelEventModel.countDocuments({
        sessionId: session._id,
        userId,
      });
      session.reelsCount = Math.max(session.reelsCount, recordedEventsCount);
    }

    await session.save();

    const sessionData = {
      id: session._id.toString(),
      clientSessionId: session.clientSessionId,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      durationSeconds: session.durationSeconds,
      reelsCount: session.reelsCount,
      createdAt: session.createdAt,
    };

    return responseHandler.sendSuccess(
      response,
      200,
      "Session ended successfully!!",
      sessionData,
    );
  },
);

/**
 * Get paginated list of sessions for the authenticated user (GET /api/sessions)
 */
export const getSessions = asyncHandler(
  async (request: Request, response: Response) => {
    const userId = request.user?._id;

    if (!userId) {
      return responseHandler.sendError(response, 400, "UserId not found!!");
    }

    const page = Math.max(1, parseInt(request.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(request.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { userId };

    if (request.query.startDate || request.query.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (request.query.startDate) {
        dateFilter.$gte = new Date(request.query.startDate as string);
      }
      if (request.query.endDate) {
        dateFilter.$lte = new Date(request.query.endDate as string);
      }
      filter.startedAt = dateFilter;
    }

    const [totalSessions, sessionDocs] = await Promise.all([
      UsageSession.countDocuments(filter),
      UsageSession.find(filter)
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.ceil(totalSessions / limit);

    const sessions = sessionDocs.map((s) => ({
      id: s._id.toString(),
      clientSessionId: s.clientSessionId,
      startedAt: s.startedAt,
      endedAt: s.endedAt ?? null,
      durationSeconds: s.durationSeconds,
      reelsCount: s.reelsCount,
      createdAt: s.createdAt,
    }));

    const responseData = {
      sessions,
      pagination: {
        page,
        limit,
        totalSessions,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };

    return responseHandler.sendSuccess(
      response,
      200,
      "Sessions fetched successfully!!",
      responseData,
    );
  },
);

/**
 * Get detailed information about one session including reel events (GET /api/sessions/:id)
 */
export const getSessionById = asyncHandler(
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

    const reelEventsDocs = await ReelEventModel.find({
      sessionId: session._id,
      userId,
    })
      .sort({ watchedAt: 1 })
      .lean();

    const reelEvents = reelEventsDocs.map((event) => ({
      id: event._id.toString(),
      clientEventId: event.clientEventId,
      watchedAt: event.watchedAt,
    }));

    const sessionDetails = {
      id: session._id.toString(),
      clientSessionId: session.clientSessionId,
      startedAt: session.startedAt,
      endedAt: session.endedAt ?? null,
      durationSeconds: session.durationSeconds,
      reelsCount: session.reelsCount,
      createdAt: session.createdAt,
      reelEvents,
    };

    return responseHandler.sendSuccess(
      response,
      200,
      "Session details fetched successfully!!",
      sessionDetails,
    );
  },
);
