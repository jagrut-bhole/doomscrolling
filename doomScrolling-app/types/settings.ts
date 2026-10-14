export interface AppSettings {
  id: number;
  daily_limit_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface UpdateSettingsInput {
  daily_limit_minutes: number;
}
