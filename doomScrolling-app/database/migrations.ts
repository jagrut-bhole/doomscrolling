import type { SQLiteDatabase } from 'expo-sqlite';

interface Migration {
  version: number;
  name: string;
  up: (db: SQLiteDatabase) => Promise<void>;
}

const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: async (db: SQLiteDatabase) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS profiles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          daily_limit_minutes INTEGER NOT NULL DEFAULT 30,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          started_at TEXT NOT NULL,
          ended_at TEXT,
          duration_seconds INTEGER NOT NULL DEFAULT 0,
          reels_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS reel_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER NOT NULL,
          watched_at TEXT NOT NULL,
          FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions (started_at);
        CREATE INDEX IF NOT EXISTS idx_sessions_ended_at ON sessions (ended_at);
        CREATE INDEX IF NOT EXISTS idx_reel_events_session_id ON reel_events (session_id);
        CREATE INDEX IF NOT EXISTS idx_reel_events_watched_at ON reel_events (watched_at);
      `);
    },
  },
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM schema_migrations ORDER BY version ASC;'
  );
  const appliedVersions = new Set(appliedRows.map((r) => r.version));

  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) {
      console.log(`[Database] Applying migration ${migration.version}: ${migration.name}`);
      await migration.up(db);
      await db.runAsync(
        'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);',
        migration.version,
        migration.name,
        new Date().toISOString()
      );
    }
  }
}
