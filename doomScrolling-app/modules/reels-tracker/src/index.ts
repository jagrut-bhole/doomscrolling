import { requireOptionalNativeModule } from 'expo-modules-core';

export interface NativePermissionsStatus {
  usageAccess: boolean;
  accessibility: boolean;
  overlay: boolean;
}

export interface ReelsTrackerModuleInterface {
  checkPermissions(): Promise<NativePermissionsStatus>;
  openUsageAccessSettings(): Promise<void>;
  openAccessibilitySettings(): Promise<void>;
  openOverlaySettings(): Promise<void>;
  showOverlay(count: number): Promise<void>;
  hideOverlay(): Promise<void>;
  updateOverlayCount(count: number): Promise<void>;
}

export const ReelsTracker = requireOptionalNativeModule<ReelsTrackerModuleInterface>('ReelsTracker');
export default ReelsTracker;
