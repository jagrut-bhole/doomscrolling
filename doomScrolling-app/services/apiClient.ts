import { Platform } from "react-native";
import { authStorage } from "./authStorage";

// Default development API host (10.0.2.2 for Android emulator, localhost for iOS/web)
const DEFAULT_HOST =
  Platform.OS === "android" ? "http://10.0.2.2:5000" : "http://localhost:5000";

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_HOST;

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  error?: string | null;
  data: T;
}

let isRefreshing = false;
let failedQueue: {
  resolve: (token: string) => void;
  reject: (err: any) => void;
}[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Base HTTP request handler with automatic Bearer token injection and 401 silent refresh
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false,
): Promise<T> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;
  const accessToken = await authStorage.getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (netError: any) {
    throw new Error(
      `Network error: Unable to reach backend server at ${API_BASE_URL}. ${netError.message || ""}`,
    );
  }

  // Handle 401 Unauthorized - Silent Token Refresh
  if (
    response.status === 401 &&
    !isRetry &&
    !endpoint.includes("/refresh-token")
  ) {
    if (isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        failedQueue.push({
          resolve: (newToken: string) => {
            options.headers = {
              ...(options.headers as Record<string, string>),
              Authorization: `Bearer ${newToken}`,
            };
            resolve(apiRequest<T>(endpoint, options, true));
          },
          reject: (err) => reject(err),
        });
      });
    }

    isRefreshing = true;

    try {
      const refreshToken = await authStorage.getRefreshToken();
      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const refreshResponse = await fetch(
        `${API_BASE_URL}/api/v1/users/refresh-token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${refreshToken}`,
          },
          body: JSON.stringify({ refreshToken }),
        },
      );

      const refreshJson: ApiResponse<{
        accessToken: string;
        refreshToken?: string;
      }> = await refreshResponse.json();

      if (
        !refreshResponse.ok ||
        !refreshJson.success ||
        !refreshJson.data?.accessToken
      ) {
        throw new Error(refreshJson.message || "Token refresh failed");
      }

      const newAccessToken = refreshJson.data.accessToken;
      const newRefreshToken = refreshJson.data.refreshToken || refreshToken;

      await authStorage.saveAuthTokens(newAccessToken, newRefreshToken);
      processQueue(null, newAccessToken);

      // Retry original request with new token
      return apiRequest<T>(endpoint, options, true);
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      await authStorage.clearAuth();
      throw refreshErr;
    } finally {
      isRefreshing = false;
    }
  }

  const json: ApiResponse<T> = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(
      json.message || `Request failed with status ${response.status}`,
    );
  }

  return json.data;
}

// Concrete API service endpoints
export const api = {
  // Authentication
  auth: {
    async register(data: {
      name: string;
      email: string;
      password: string;
      limit?: number;
    }) {
      const res = await apiRequest<{
        user: any;
        accessToken: string;
        refreshToken: string;
      }>("/api/v1/users/register", {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (res.accessToken && res.refreshToken) {
        await authStorage.saveAuthTokens(res.accessToken, res.refreshToken);
        await authStorage.setStoredUser(res.user);
      }
      return res;
    },

    async login(data: { email: string; password: string }) {
      const res = await apiRequest<{
        user: any;
        accessToken: string;
        refreshToken: string;
      }>("/api/v1/users/login", {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (res.accessToken && res.refreshToken) {
        await authStorage.saveAuthTokens(res.accessToken, res.refreshToken);
        await authStorage.setStoredUser(res.user);
      }
      return res;
    },

    async logout() {
      try {
        await apiRequest("/api/v1/users/logout", { method: "POST" });
      } finally {
        await authStorage.clearAuth();
      }
    },
  },

  // Dashboard API
  dashboard: {
    async getDashboard(timezone?: string) {
      const query = timezone ? `?timezone=${encodeURIComponent(timezone)}` : "";
      return await apiRequest<any>(`/api/dashboard${query}`);
    },
  },

  // Sessions API
  sessions: {
    async create(data: { clientSessionId?: string; startedAt?: string }) {
      return await apiRequest<any>("/api/sessions", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async end(
      sessionId: string | number,
      data: { endedAt?: string; durationSeconds?: number; reelsCount?: number },
    ) {
      return await apiRequest<any>(`/api/sessions/${sessionId}/end`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },

    async getAll(page = 1, limit = 20) {
      return await apiRequest<any>(`/api/sessions?page=${page}&limit=${limit}`);
    },

    async getById(sessionId: string | number) {
      return await apiRequest<any>(`/api/sessions/${sessionId}`);
    },

    async recordEvents(
      sessionId: string | number,
      events: {
        clientEventId?: string;
        watchedAt?: string;
      }[],
    ) {
      return await apiRequest<any>(`/api/sessions/${sessionId}/events`, {
        method: "POST",
        body: JSON.stringify({ events }),
      });
    },
  },

  // SQLite to MongoDB Sync API
  sync: {
    async syncData(payload: {
      sessions?: {
        clientSessionId: string;
        startedAt: string;
        endedAt?: string | null;
        durationSeconds: number;
        reelsCount: number;
      }[];
      reelEvents?: {
        clientEventId: string;
        clientSessionId: string;
        watchedAt: string;
      }[];
    }) {
      return await apiRequest<{
        syncedSessions: number;
        syncedEvents: number;
        syncedAt: string;
      }>("/api/sync", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  },
};
