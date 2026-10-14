import { getDatabase } from '../index';
import type { AppSettings, UpdateSettingsInput } from '@/types/settings';

export const DEFAULT_DAILY_LIMIT_MINUTES = 30;

export async function getSettings(): Promise<AppSettings> {
  const db = await getDatabase();
  let row = await db.getFirstAsync<AppSettings>(
    'SELECT * FROM settings ORDER BY id ASC LIMIT 1;'
  );

  if (!row) {
    const now = new Date().toISOString();
    const result = await db.runAsync(
      'INSERT INTO settings (daily_limit_minutes, created_at, updated_at) VALUES (?, ?, ?);',
      DEFAULT_DAILY_LIMIT_MINUTES,
      now,
      now
    );

    row = await db.getFirstAsync<AppSettings>(
      'SELECT * FROM settings WHERE id = ?;',
      result.lastInsertRowId
    );
  }

  if (!row) {
    throw new Error('Failed to retrieve or create settings');
  }

  return row;
}

export async function updateDailyLimit(dailyLimitMinutes: number): Promise<AppSettings> {
  if (dailyLimitMinutes <= 0) {
    throw new Error('Daily limit must be greater than 0 minutes');
  }

  const db = await getDatabase();
  const existing = await getSettings();
  const now = new Date().toISOString();

  await db.runAsync(
    'UPDATE settings SET daily_limit_minutes = ?, updated_at = ? WHERE id = ?;',
    dailyLimitMinutes,
    now,
    existing.id
  );

  const updated = await db.getFirstAsync<AppSettings>(
    'SELECT * FROM settings WHERE id = ?;',
    existing.id
  );

  if (!updated) {
    throw new Error('Failed to retrieve updated settings');
  }

  return updated;
}
