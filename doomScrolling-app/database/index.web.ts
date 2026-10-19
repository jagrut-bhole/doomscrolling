export const DATABASE_NAME = 'doomscrolling_web.db';

interface InMemoryTable {
  [id: number]: any;
}

const memoryStore: Record<string, InMemoryTable> = {
  profiles: {
    1: { id: 1, name: 'Web User', email: 'user@example.com', created_at: new Date().toISOString() },
  },
  settings: {
    1: { id: 1, daily_limit_minutes: 30, tracking_enabled: 1, updated_at: new Date().toISOString() },
  },
  sessions: {},
  reel_events: {},
};

let autoIncrementId = 100;

class WebSQLiteMock {
  async runAsync(sql: string, ...args: any[]): Promise<{ lastInsertRowId: number; changes: number }> {
    const trimmed = sql.trim().toUpperCase();

    if (trimmed.startsWith('INSERT INTO')) {
      const match = sql.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)/i);
      const tableName = match ? match[1].toLowerCase() : '';
      const newId = ++autoIncrementId;

      if (!memoryStore[tableName]) {
        memoryStore[tableName] = {};
      }

      if (tableName === 'sessions') {
        const started_at = args[0] || new Date().toISOString();
        const created_at = args[1] || new Date().toISOString();
        memoryStore.sessions[newId] = {
          id: newId,
          started_at,
          ended_at: null,
          duration_seconds: 0,
          reels_count: 0,
          created_at,
        };
      } else if (tableName === 'reel_events') {
        const session_id = args[0];
        const watched_at = args[1] || new Date().toISOString();
        memoryStore.reel_events[newId] = {
          id: newId,
          session_id,
          watched_at,
        };
      } else if (tableName === 'profiles') {
        memoryStore.profiles[newId] = {
          id: newId,
          name: args[0],
          email: args[1],
          created_at: new Date().toISOString(),
        };
      }

      return { lastInsertRowId: newId, changes: 1 };
    }

    if (trimmed.startsWith('UPDATE')) {
      const match = sql.match(/UPDATE\s+([a-zA-Z0-9_]+)/i);
      const tableName = match ? match[1].toLowerCase() : '';

      if (tableName === 'sessions') {
        if (sql.includes('ended_at = ?') && sql.includes('duration_seconds = ?')) {
          const ended_at = args[0];
          const duration_seconds = args[1];
          const reels_count = args[2];
          const sessionId = args[3];
          if (memoryStore.sessions[sessionId]) {
            memoryStore.sessions[sessionId].ended_at = ended_at;
            memoryStore.sessions[sessionId].duration_seconds = duration_seconds;
            memoryStore.sessions[sessionId].reels_count = reels_count;
          }
        }
      } else if (tableName === 'settings') {
        if (args[0] !== undefined) {
          if (!memoryStore.settings[1]) {
            memoryStore.settings[1] = { id: 1, daily_limit_minutes: 30, tracking_enabled: 1 };
          }
          memoryStore.settings[1].daily_limit_minutes = args[0];
        }
      }
      return { lastInsertRowId: 0, changes: 1 };
    }

    if (trimmed.startsWith('DELETE FROM')) {
      const match = sql.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)/i);
      const tableName = match ? match[1].toLowerCase() : '';
      if (tableName && memoryStore[tableName]) {
        memoryStore[tableName] = {};
      }
      return { lastInsertRowId: 0, changes: 1 };
    }

    return { lastInsertRowId: 0, changes: 0 };
  }

  async getFirstAsync<T = any>(sql: string, ...args: any[]): Promise<T | null> {
    const list = await this.getAllAsync<T>(sql, ...args);
    return list.length > 0 ? list[0] : null;
  }

  async getAllAsync<T = any>(sql: string, ...args: any[]): Promise<T[]> {
    const match = sql.match(/FROM\s+([a-zA-Z0-9_]+)/i);
    const tableName = match ? match[1].toLowerCase() : '';
    const table = memoryStore[tableName] || {};
    let rows = Object.values(table) as any[];

    if (sql.includes('WHERE id = ?') && args[0] !== undefined) {
      rows = rows.filter((r) => r.id === args[0]);
    } else if (sql.includes('WHERE session_id = ?') && args[0] !== undefined) {
      rows = rows.filter((r) => r.session_id === args[0]);
    } else if (sql.includes('ORDER BY started_at DESC')) {
      rows = rows.sort(
        (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      );
    }

    if (sql.includes('LIMIT ?') && typeof args[args.length - 1] === 'number') {
      rows = rows.slice(0, args[args.length - 1]);
    }

    return rows as T[];
  }

  async execAsync(_sql: string): Promise<void> {
    // No-op for PRAGMA or manual SQL execution on web mock
  }

  async withExclusiveTransactionAsync<T>(task: (txn: WebSQLiteMock) => Promise<T>): Promise<T> {
    return await task(this);
  }

  async closeAsync(): Promise<void> {
    // No-op
  }
}

const webDbInstance = new WebSQLiteMock();

export async function getDatabase(): Promise<any> {
  return webDbInstance;
}

export async function resetUsageHistory(): Promise<void> {
  memoryStore.reel_events = {};
  memoryStore.sessions = {};
}

export async function fullResetDatabase(): Promise<void> {
  memoryStore.reel_events = {};
  memoryStore.sessions = {};
  memoryStore.settings = {};
  memoryStore.profiles = {};
}

export async function closeDatabase(): Promise<void> {
  // No-op on web
}
