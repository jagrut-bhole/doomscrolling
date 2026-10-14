"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocalDayBoundaries = getLocalDayBoundaries;
exports.formatDuration = formatDuration;
exports.getDashboardData = getDashboardData;
const settingsRepository_1 = require("@/database/repositories/settingsRepository");
const sessionRepository_1 = require("@/database/repositories/sessionRepository");
const reelEventRepository_1 = require("@/database/repositories/reelEventRepository");
/**
 * Returns the local date boundaries for a given Date object.
 */
function getLocalDayBoundaries(date = new Date()) {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    return { start, end };
}
/**
 * Formats duration in seconds to a human-friendly string like "1h 15m" or "24m" or "45s".
 */
function formatDuration(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const remainingSeconds = s % 60;
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
        return `${minutes}m ${remainingSeconds > 0 ? `${remainingSeconds}s` : ''}`.trim();
    }
    return `${remainingSeconds}s`;
}
/**
 * Calculates overlap duration in seconds between a session and a given time window.
 */
function calculateWindowOverlapSeconds(session, windowStart, windowEnd) {
    const sStart = new Date(session.started_at).getTime();
    const sEnd = session.ended_at
        ? new Date(session.ended_at).getTime()
        : Math.max(sStart + session.duration_seconds * 1000, Date.now());
    const overlapStart = Math.max(sStart, windowStart.getTime());
    const overlapEnd = Math.min(sEnd, windowEnd.getTime());
    if (overlapEnd <= overlapStart) {
        return 0;
    }
    return Math.floor((overlapEnd - overlapStart) / 1000);
}
/**
 * Calculates all statistics required for the dashboard.
 */
async function getDashboardData() {
    const now = new Date();
    const settings = await (0, settingsRepository_1.getSettings)();
    const dailyLimitMinutes = settings.daily_limit_minutes;
    const dailyLimitSeconds = dailyLimitMinutes * 60;
    // 1. Today's window
    const { start: todayStart, end: todayEnd } = getLocalDayBoundaries(now);
    // Buffer search range by 1 day back to capture sessions that crossed midnight
    const searchStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const sessionsAroundToday = await (0, sessionRepository_1.getSessionsForDateRange)(searchStart.toISOString(), todayEnd.toISOString());
    let todayDurationSeconds = 0;
    for (const session of sessionsAroundToday) {
        todayDurationSeconds += calculateWindowOverlapSeconds(session, todayStart, todayEnd);
    }
    // Today's reel events
    const todayEvents = await (0, reelEventRepository_1.getEventsForDateRange)(todayStart.toISOString(), todayEnd.toISOString());
    // If no reel events recorded yet, fall back to reels_count of sessions today
    let todayReelsCount = todayEvents.length;
    if (todayReelsCount === 0) {
        todayReelsCount = sessionsAroundToday
            .filter((s) => new Date(s.started_at) >= todayStart && new Date(s.started_at) <= todayEnd)
            .reduce((sum, s) => sum + (s.reels_count || 0), 0);
    }
    const overtimeSeconds = Math.max(0, todayDurationSeconds - dailyLimitSeconds);
    const timeRemainingSeconds = Math.max(0, dailyLimitSeconds - todayDurationSeconds);
    const progressPercent = dailyLimitSeconds > 0
        ? Math.min(100, Math.round((todayDurationSeconds / dailyLimitSeconds) * 100))
        : 100;
    const isOverLimit = todayDurationSeconds > dailyLimitSeconds;
    const todayOverview = {
        totalDurationSeconds: todayDurationSeconds,
        totalDurationMinutes: Math.round(todayDurationSeconds / 60),
        reelsCount: todayReelsCount,
        dailyLimitMinutes,
        dailyLimitSeconds,
        timeRemainingSeconds,
        timeRemainingMinutes: Math.round(timeRemainingSeconds / 60),
        overtimeSeconds,
        overtimeMinutes: Math.round(overtimeSeconds / 60),
        progressPercent,
        isOverLimit,
    };
    // 2. Hourly breakdown for today (24 hours)
    const hourlyUsage = [];
    for (let h = 0; h < 24; h++) {
        const hStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, 0, 0, 0);
        const hEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, 59, 59, 999);
        let hourDurationSec = 0;
        for (const session of sessionsAroundToday) {
            hourDurationSec += calculateWindowOverlapSeconds(session, hStart, hEnd);
        }
        const hourEventsCount = todayEvents.filter((e) => {
            const eTime = new Date(e.watched_at);
            return eTime >= hStart && eTime <= hEnd;
        }).length;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayHour = h % 12 === 0 ? 12 : h % 12;
        hourlyUsage.push({
            hour: h,
            label: `${displayHour} ${ampm}`,
            durationMinutes: Math.round((hourDurationSec / 60) * 10) / 10,
            reelsCount: hourEventsCount,
        });
    }
    // 3. Last 7 days usage
    const last7DaysUsage = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
        const targetDay = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const { start: dStart, end: dEnd } = getLocalDayBoundaries(targetDay);
        const daySessions = await (0, sessionRepository_1.getSessionsForDateRange)(new Date(dStart.getTime() - 24 * 60 * 60 * 1000).toISOString(), dEnd.toISOString());
        let dDurationSec = 0;
        for (const s of daySessions) {
            dDurationSec += calculateWindowOverlapSeconds(s, dStart, dEnd);
        }
        const dEvents = await (0, reelEventRepository_1.getEventsForDateRange)(dStart.toISOString(), dEnd.toISOString());
        let dReelsCount = dEvents.length;
        if (dReelsCount === 0) {
            dReelsCount = daySessions
                .filter((s) => new Date(s.started_at) >= dStart && new Date(s.started_at) <= dEnd)
                .reduce((sum, s) => sum + (s.reels_count || 0), 0);
        }
        const dDurationMinutes = Math.round(dDurationSec / 60);
        const dOvertimeMinutes = Math.max(0, dDurationMinutes - dailyLimitMinutes);
        last7DaysUsage.push({
            dateIso: dStart.toISOString().split('T')[0],
            dayLabel: i === 0 ? 'Today' : dayNames[targetDay.getDay()],
            durationMinutes: dDurationMinutes,
            reelsCount: dReelsCount,
            dailyLimitMinutes,
            overtimeMinutes: dOvertimeMinutes,
        });
    }
    // 4. Recent sessions
    const recentSessions = await (0, sessionRepository_1.getRecentSessions)(15);
    return {
        today: todayOverview,
        hourlyUsage,
        last7DaysUsage,
        recentSessions,
    };
}
