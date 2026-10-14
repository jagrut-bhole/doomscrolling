import { getDatabase } from '../index';
import type { UserProfile, CreateProfileInput, UpdateProfileInput } from '@/types/profile';

export async function getProfile(): Promise<UserProfile | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<UserProfile>(
    'SELECT * FROM profiles ORDER BY id ASC LIMIT 1;'
  );
  return row ?? null;
}

export async function hasProfile(): Promise<boolean> {
  const profile = await getProfile();
  return profile !== null;
}

export async function createProfile(input: CreateProfileInput): Promise<UserProfile> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const trimmedName = input.name.trim();
  const trimmedEmail = input.email && input.email.trim().length > 0 ? input.email.trim() : null;

  const result = await db.runAsync(
    'INSERT INTO profiles (name, email, created_at, updated_at) VALUES (?, ?, ?, ?);',
    trimmedName,
    trimmedEmail,
    now,
    now
  );

  const profile = await db.getFirstAsync<UserProfile>(
    'SELECT * FROM profiles WHERE id = ?;',
    result.lastInsertRowId
  );

  if (!profile) {
    throw new Error('Failed to retrieve created profile');
  }

  return profile;
}

export async function updateProfile(input: UpdateProfileInput): Promise<UserProfile> {
  const db = await getDatabase();
  const existing = await getProfile();

  if (!existing) {
    throw new Error('No existing profile to update');
  }

  const now = new Date().toISOString();
  const newName = input.name !== undefined ? input.name.trim() : existing.name;
  const newEmail = input.email !== undefined
    ? (input.email && input.email.trim().length > 0 ? input.email.trim() : null)
    : existing.email;

  await db.runAsync(
    'UPDATE profiles SET name = ?, email = ?, updated_at = ? WHERE id = ?;',
    newName,
    newEmail,
    now,
    existing.id
  );

  const updated = await db.getFirstAsync<UserProfile>(
    'SELECT * FROM profiles WHERE id = ?;',
    existing.id
  );

  if (!updated) {
    throw new Error('Failed to retrieve updated profile');
  }

  return updated;
}
