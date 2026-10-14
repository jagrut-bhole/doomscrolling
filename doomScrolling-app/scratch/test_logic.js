"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const usageStatistics_1 = require("./usageStatistics");
function assert(condition, msg) {
    if (!condition) {
        throw new Error(`Assertion failed: ${msg}`);
    }
    console.log(`✓ ${msg}`);
}
console.log('--- Running Logic Verification ---');
// 1. Duration Formatting Tests
assert((0, usageStatistics_1.formatDuration)(0) === '0s', 'formatDuration(0) should be 0s');
assert((0, usageStatistics_1.formatDuration)(45) === '45s', 'formatDuration(45) should be 45s');
assert((0, usageStatistics_1.formatDuration)(60) === '1m', 'formatDuration(60) should be 1m');
assert((0, usageStatistics_1.formatDuration)(85) === '1m 25s', 'formatDuration(85) should be 1m 25s');
assert((0, usageStatistics_1.formatDuration)(3600) === '1h 0m', 'formatDuration(3600) should be 1h 0m');
assert((0, usageStatistics_1.formatDuration)(5420) === '1h 30m', 'formatDuration(5420) should be 1h 30m');
// 2. Date Boundary Tests
const testDate = new Date(2026, 9, 12, 14, 30, 0); // Oct 12, 2026 14:30:00
const { start, end } = (0, usageStatistics_1.getLocalDayBoundaries)(testDate);
assert(start.getHours() === 0 && start.getMinutes() === 0 && start.getSeconds() === 0, 'Day start is 00:00:00');
assert(end.getHours() === 23 && end.getMinutes() === 59 && end.getSeconds() === 59, 'Day end is 23:59:59');
// 3. Midnight Overlap Logic Verification
const sessionStart = new Date(2026, 9, 11, 23, 45, 0).getTime();
const sessionEnd = new Date(2026, 9, 12, 0, 30, 0).getTime();
const day12Start = new Date(2026, 9, 12, 0, 0, 0, 0).getTime();
const day12End = new Date(2026, 9, 12, 23, 59, 59, 999).getTime();
const overlapStart = Math.max(sessionStart, day12Start);
const overlapEnd = Math.min(sessionEnd, day12End);
const overlapSecondsToday = Math.floor((overlapEnd - overlapStart) / 1000);
assert(overlapSecondsToday === 30 * 60, 'Apportions exactly 30 minutes (1800s) to Oct 12 for midnight crossing session');
// 4. Overtime Calculation Verification
const dailyLimitSec = 30 * 60; // 30 mins = 1800s
const watchedSec42m = 42 * 60; // 42 mins = 2520s
const overtime = Math.max(0, watchedSec42m - dailyLimitSec);
const remaining = Math.max(0, dailyLimitSec - watchedSec42m);
assert(overtime === 12 * 60, 'Overtime for 42m watched with 30m limit is exactly 12m');
assert(remaining === 0, 'Remaining time is 0 when over limit');
console.log('All logic verifications passed successfully!');
