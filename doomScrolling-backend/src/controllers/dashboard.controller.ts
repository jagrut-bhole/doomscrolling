import type { Request, Response } from "express";

// utilities
import { asyncHandler } from "@/utils/asyncHandler";
import { responseHandler } from "@/utils/responseHandler";

// mongoose models
import User from "@/models/user.model";
import ReelEventModel from "@/models/reelEvent.model";
import UsageSession from "@/models/usageSession.model";
import UserSetting from "@/models/userSettings.model";

/**
 * Returns the day boundaries for a given date
 */
export const getDayBoundaries = (date: Date = new Date()) => {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  return { start, end };
};

/**
 * Calculates overlap duration in seconds between a session and a window
 */
export const calculateWindowOverlapSeconds = (
  startedAt: Date,
  endedAt: Date | null | undefined,
  durationSeconds: number,
  windowStart: Date,
  windowEnd: Date,
): number => {
  const sStart = new Date(startedAt).getTime();
  const sEnd = endedAt
    ? new Date(endedAt).getTime()
    : Math.max(sStart + (durationSeconds || 0) * 1000, Date.now());

  const overlapStart = Math.max(sStart, windowStart.getTime());
  const overlapEnd = Math.min(sEnd, windowEnd.getTime());

  if (overlapEnd <= overlapStart) {
    return 0;
  }

  return Math.floor((overlapEnd - overlapStart) / 1000);
};

export const getDashboard = asyncHandler(
  async (request: Request, response: Response) => {
    const userId = request.user?._id;

    if (!userId) {
      return responseHandler.sendError(response, 400, "UserId not found!!");
    }

    const user = await User.findById(userId);

    if (!user) {
      return responseHandler.sendError(response, 404, "User not found!!");
    }

    const userSetting = await UserSetting.findOne({ userId });
    const dailyLimitMinutes = user.limit ?? userSetting?.dailyLimitMinutes ?? 30;
    const dailyLimitSeconds = dailyLimitMinutes * 60;

    const now = new Date();
    const { start: todayStart, end: todayEnd } = getDayBoundaries(now);

    // 7 days ago boundary
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
    const searchBufferStart = new Date(weekStart.getTime() - 24 * 60 * 60 * 1000);

    // Fetch sessions within the week window plus 1-day buffer for midnight crossings
    const sessionsInWindow = await UsageSession.find({
      userId,
      startedAt: { $gte: searchBufferStart, $lte: todayEnd },
    })
      .sort({ startedAt: -1 })
      .lean();

    // Fetch reel events in window
    const reelEventsInWindow = await ReelEventModel.find({
      userId,
      watchedAt: { $gte: searchBufferStart, $lte: todayEnd },
    }).lean();

    // 1. Calculate today's summary
    let todayWatchedSeconds = 0;
    for (const session of sessionsInWindow) {
      todayWatchedSeconds += calculateWindowOverlapSeconds(
        session.startedAt,
        session.endedAt,
        session.durationSeconds,
        todayStart,
        todayEnd,
      );
    }

    const todayEvents = reelEventsInWindow.filter((e) => {
      const wAt = new Date(e.watchedAt).getTime();
      return wAt >= todayStart.getTime() && wAt <= todayEnd.getTime();
    });

    let todayReelsCount = todayEvents.length;
    if (todayReelsCount === 0) {
      todayReelsCount = sessionsInWindow
        .filter((s) => {
          const sTime = new Date(s.startedAt).getTime();
          return sTime >= todayStart.getTime() && sTime <= todayEnd.getTime();
        })
        .reduce((sum, s) => sum + (s.reelsCount || 0), 0);
    }

    const overtimeSeconds = Math.max(0, todayWatchedSeconds - dailyLimitSeconds);
    const remainingSeconds = Math.max(0, dailyLimitSeconds - todayWatchedSeconds);

    // 2. Hourly usage for today (24 hours)
    const hourlyUsage = [];
    for (let h = 0; h < 24; h++) {
      const hStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, 0, 0, 0);
      const hEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, 59, 59, 999);

      let hourDurationSeconds = 0;
      for (const session of sessionsInWindow) {
        hourDurationSeconds += calculateWindowOverlapSeconds(
          session.startedAt,
          session.endedAt,
          session.durationSeconds,
          hStart,
          hEnd,
        );
      }

      const hourEvents = todayEvents.filter((e) => {
        const wAt = new Date(e.watchedAt).getTime();
        return wAt >= hStart.getTime() && wAt <= hEnd.getTime();
      });

      let hourReels = hourEvents.length;
      if (hourReels === 0) {
        hourReels = sessionsInWindow
          .filter((s) => {
            const sTime = new Date(s.startedAt).getTime();
            return sTime >= hStart.getTime() && sTime <= hEnd.getTime();
          })
          .reduce((sum, s) => sum + (s.reelsCount || 0), 0);
      }

      const formattedHour = `${String(h).padStart(2, "0")}:00`;

      hourlyUsage.push({
        hour: formattedHour,
        durationSeconds: hourDurationSeconds,
        reelsCount: hourReels,
      });
    }

    // 3. Weekly usage for the last 7 days
    const weeklyUsage = [];
    for (let i = 6; i >= 0; i--) {
      const targetDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const { start: dStart, end: dEnd } = getDayBoundaries(targetDay);

      let dayDurationSeconds = 0;
      for (const session of sessionsInWindow) {
        dayDurationSeconds += calculateWindowOverlapSeconds(
          session.startedAt,
          session.endedAt,
          session.durationSeconds,
          dStart,
          dEnd,
        );
      }

      const dayEvents = reelEventsInWindow.filter((e) => {
        const wAt = new Date(e.watchedAt).getTime();
        return wAt >= dStart.getTime() && wAt <= dEnd.getTime();
      });

      let dayReels = dayEvents.length;
      if (dayReels === 0) {
        dayReels = sessionsInWindow
          .filter((s) => {
            const sTime = new Date(s.startedAt).getTime();
            return sTime >= dStart.getTime() && sTime <= dEnd.getTime();
          })
          .reduce((sum, s) => sum + (s.reelsCount || 0), 0);
      }

      const yyyy = targetDay.getFullYear();
      const mm = String(targetDay.getMonth() + 1).padStart(2, "0");
      const dd = String(targetDay.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;

      weeklyUsage.push({
        date: dateStr,
        durationSeconds: dayDurationSeconds,
        reelsCount: dayReels,
      });
    }

    // 4. Recent sessions (last 10 sessions)
    const recentSessionsDocs = await UsageSession.find({ userId })
      .sort({ startedAt: -1 })
      .limit(10)
      .lean();

    const recentSessions = recentSessionsDocs.map((s) => ({
      id: s._id.toString(),
      startedAt: s.startedAt,
      endedAt: s.endedAt ?? null,
      durationSeconds: s.durationSeconds,
      reelsCount: s.reelsCount,
    }));

    const dashboardResponse = {
      summary: {
        totalWatchedSeconds: todayWatchedSeconds,
        totalReels: todayReelsCount,
        dailyLimitMinutes,
        remainingSeconds,
        overtimeSeconds,
      },
      hourlyUsage,
      weeklyUsage,
      recentSessions,
    };

    return responseHandler.sendSuccess(
      response,
      200,
      "Dashboard fetched successfully!!",
      dashboardResponse,
    );
  },
);