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

function getLocalDayBoundaries(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  return { start, end };
}

function assert(condition, msg) {
  if (!condition) {
    console.error(`✗ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✓ ${msg}`);
}

console.log('=== RUNNING TESTS ===');

// 1. Duration Formatting
assert(formatDuration(0) === '0s', 'formatDuration(0) is 0s');
assert(formatDuration(45) === '45s', 'formatDuration(45) is 45s');
assert(formatDuration(60) === '1m', 'formatDuration(60) is 1m');
assert(formatDuration(85) === '1m 25s', 'formatDuration(85) is 1m 25s');
assert(formatDuration(3600) === '1h 0m', 'formatDuration(3600) is 1h 0m');
assert(formatDuration(5420) === '1h 30m', 'formatDuration(5420) is 1h 30m');

// 2. Day Boundaries
const testDate = new Date(2026, 9, 12, 14, 30, 0);
const { start, end } = getLocalDayBoundaries(testDate);
assert(start.getHours() === 0 && start.getMinutes() === 0, 'Start is 00:00');
assert(end.getHours() === 23 && end.getMinutes() === 59, 'End is 23:59');

// 3. Midnight Crossing Apportionment
// Session started Oct 11 23:45 and ended Oct 12 00:30 (45 mins total)
const sessionStart = new Date(2026, 9, 11, 23, 45, 0).getTime();
const sessionEnd = new Date(2026, 9, 12, 0, 30, 0).getTime();
const day12Start = new Date(2026, 9, 12, 0, 0, 0, 0).getTime();
const day12End = new Date(2026, 9, 12, 23, 59, 59, 999).getTime();

const overlapStart = Math.max(sessionStart, day12Start);
const overlapEnd = Math.min(sessionEnd, day12End);
const overlapSecondsToday = Math.floor((overlapEnd - overlapStart) / 1000);

assert(overlapSecondsToday === 30 * 60, 'Oct 12 portion is 30 mins (1800s)');

// 4. Overtime Calculation (Formula: max(0, total daily Reels time - daily limit))
const dailyLimitSec = 30 * 60;
const watchedSec42m = 42 * 60;
const overtime = Math.max(0, watchedSec42m - dailyLimitSec);
const remaining = Math.max(0, dailyLimitSec - watchedSec42m);

assert(overtime === 12 * 60, 'Overtime for 42m with 30m limit is 12m (720s)');
assert(remaining === 0, 'Remaining time is 0 when exceeded');

const watchedSec20m = 20 * 60;
const overtime20m = Math.max(0, watchedSec20m - dailyLimitSec);
const remaining20m = Math.max(0, dailyLimitSec - watchedSec20m);
assert(overtime20m === 0, 'Overtime is 0 when below limit');
assert(remaining20m === 10 * 60, 'Remaining time is 10m when 20m watched of 30m limit');

console.log('=== ALL LOGIC AND EDGE CASE TESTS PASSED ===');
