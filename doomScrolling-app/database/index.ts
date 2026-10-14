import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';

export const DATABASE_NAME = 'doomscrolling.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Initializes and returns the shared SQLite database instance.
 * Ensures foreign key enforcement and schema migrations are applied.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      // Enable foreign key constraints for this connection
      await db.execAsync('PRAGMA foreign_keys = ON;');
      // Run pending migrations
      await runMigrations(db);
      dbInstance = db;
      return db;
    } catch (error) {
      console.error('[Database] Failed to initialize database:', error);
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
}

/**
 * Resets only tracking usage history (sessions and reel events)
 * preserving user profile and settings.
 */
export async function resetUsageHistory(): Promise<void> {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.execAsync('DELETE FROM reel_events;');
    await txn.execAsync('DELETE FROM sessions;');
  });
  console.log('[Database] Usage history reset successfully.');
}

/**
 * Performs a complete wipe of all tables (profile, settings, sessions, events).
 */
export async function fullResetDatabase(): Promise<void> {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.execAsync('DELETE FROM reel_events;');
    await txn.execAsync('DELETE FROM sessions;');
    await txn.execAsync('DELETE FROM settings;');
    await txn.execAsync('DELETE FROM profiles;');
  });
  console.log('[Database] Full database wipe completed.');
}

/**
 * Closes current database connection if open.
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
    initPromise = null;
  }
}
