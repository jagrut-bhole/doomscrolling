import { Platform, Linking, NativeModules } from 'react-native';
import { ReelsTracker } from '@/modules/reels-tracker/src';

export interface PermissionsStatus {
  usageAccess: boolean;
  accessibility: boolean;
  overlay: boolean;
}

export interface TrackingStatus {
  isTracking: boolean;
  isReelsActive: boolean;
  currentReelsCount: number;
  sessionDurationSeconds: number;
}

// Fallback state for platforms / environments without the compiled native APK
let simulatedPermissions: PermissionsStatus = {
  usageAccess: false,
  accessibility: false,
  overlay: false,
};

/**
 * Checks the status of all 3 required Android permissions.
 */
export async function checkPermissions(): Promise<PermissionsStatus> {
  if (Platform.OS !== 'android') {
    return {
      usageAccess: true,
      accessibility: true,
      overlay: true,
    };
  }

  try {
    if (ReelsTracker && typeof ReelsTracker.checkPermissions === 'function') {
      const status = await ReelsTracker.checkPermissions();
      return {
        usageAccess: Boolean(status.usageAccess),
        accessibility: Boolean(status.accessibility),
        overlay: Boolean(status.overlay),
      };
    }

    const legacyModule = NativeModules.ReelsTrackerModule;
    if (legacyModule && typeof legacyModule.checkPermissions === 'function') {
      const status = await legacyModule.checkPermissions();
      return {
        usageAccess: Boolean(status.usageAccess),
        accessibility: Boolean(status.accessibility),
        overlay: Boolean(status.overlay),
      };
    }
  } catch (error) {
    console.warn('[TrackingService] Failed to check native permissions:', error);
  }

  return simulatedPermissions;
}

/**
 * For testing/development in emulators or development environments.
 */
export function setSimulatedPermission(permission: keyof PermissionsStatus, granted: boolean) {
  simulatedPermissions = {
    ...simulatedPermissions,
    [permission]: granted,
  };
}

/**
 * Checks if all required permissions are granted.
 */
export function areAllPermissionsGranted(status: PermissionsStatus): boolean {
  return status.usageAccess && status.accessibility && status.overlay;
}

/**
 * Opens system settings for Usage Access.
 */
export async function requestUsageAccessPermission(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    if (ReelsTracker && typeof ReelsTracker.openUsageAccessSettings === 'function') {
      await ReelsTracker.openUsageAccessSettings();
      return;
    }
    await Linking.sendIntent('android.settings.USAGE_ACCESS_SETTINGS');
  } catch (error) {
    console.warn('[TrackingService] Failed to open usage access settings:', error);
    await Linking.openSettings();
  }
}

/**
 * Opens system settings for Accessibility Service.
 */
export async function requestAccessibilityPermission(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    if (ReelsTracker && typeof ReelsTracker.openAccessibilitySettings === 'function') {
      await ReelsTracker.openAccessibilitySettings();
      return;
    }
    await Linking.sendIntent('android.settings.ACCESSIBILITY_SETTINGS');
  } catch (error) {
    console.warn('[TrackingService] Failed to open accessibility settings:', error);
    await Linking.openSettings();
  }
}

/**
 * Opens system settings for Display Over Other Apps (Overlay).
 */
export async function requestOverlayPermission(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    if (ReelsTracker && typeof ReelsTracker.openOverlaySettings === 'function') {
      await ReelsTracker.openOverlaySettings();
      return;
    }
    await Linking.sendIntent('android.settings.action.MANAGE_OVERLAY_PERMISSION', [
      { key: 'package', value: 'package:com.doomscrolling' },
    ]);
  } catch (error) {
    console.warn('[TrackingService] Failed to open overlay settings:', error);
    await Linking.openSettings();
  }
}

/**
 * Displays the native floating overlay pill.
 */
export async function showFloatingOverlay(count: number = 0): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    if (ReelsTracker && typeof ReelsTracker.showOverlay === 'function') {
      await ReelsTracker.showOverlay(count);
    }
  } catch (err) {
    console.warn('[TrackingService] Failed to show overlay:', err);
  }
}

/**
 * Hides the native floating overlay pill.
 */
export async function hideFloatingOverlay(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    if (ReelsTracker && typeof ReelsTracker.hideOverlay === 'function') {
      await ReelsTracker.hideOverlay();
    }
  } catch (err) {
    console.warn('[TrackingService] Failed to hide overlay:', err);
  }
}

/**
 * Simulates a completed Reels session (useful for manual testing and validation).
 */
export async function recordSimulatedSession(
  durationSeconds: number,
  reelsCount: number
): Promise<void> {
  const { createSession, closeSession } = await import('@/database/repositories/sessionRepository');
  const { recordReelEvent } = await import('@/database/repositories/reelEventRepository');

  const now = Date.now();
  const startTime = new Date(now - durationSeconds * 1000).toISOString();
  const endTime = new Date(now).toISOString();

  const session = await createSession(startTime);

  // Generate evenly spaced reel events
  const interval = durationSeconds / Math.max(1, reelsCount);
  for (let i = 0; i < reelsCount; i++) {
    const eventTime = new Date(now - durationSeconds * 1000 + i * interval * 1000).toISOString();
    await recordReelEvent(session.id, eventTime);
  }

  await closeSession(session.id, endTime, durationSeconds, reelsCount);
  console.log(`[TrackingService] Simulated session ${session.id} recorded (${durationSeconds}s, ${reelsCount} reels)`);
}
