export interface UserProfile {
  id: number;
  name: string;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProfileInput {
  name: string;
  email?: string | null;
}

export interface UpdateProfileInput {
  name?: string;
  email?: string | null;
}
