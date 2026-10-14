import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, AppState, ScrollView } from 'react-native';
import {
  checkPermissions,
  requestUsageAccessPermission,
  requestAccessibilityPermission,
  requestOverlayPermission,
  areAllPermissionsGranted,
  setSimulatedPermission,
  type PermissionsStatus,
} from '@/services/tracking';

interface PermissionSetupProps {
  onComplete: () => void;
}

export default function PermissionSetup({ onComplete }: PermissionSetupProps) {
  const [permissions, setPermissions] = useState<PermissionsStatus>({
    usageAccess: false,
    accessibility: false,
    overlay: false,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshPermissions = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const status = await checkPermissions();
      setPermissions(status);
    } catch (e) {
      console.error('Failed to check permissions:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    checkPermissions()
      .then((status) => {
        if (isMounted) setPermissions(status);
      })
      .catch((err) => console.error('Failed to check permissions:', err));

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkPermissions()
          .then((status) => {
            if (isMounted) setPermissions(status);
          })
          .catch((err) => console.error('Failed to check permissions:', err));
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  const allGranted = areAllPermissionsGranted(permissions);

  return (
    <ScrollView className="w-full" showsVerticalScrollIndicator={false}>
      <Text className="text-sm text-gray-600 mb-4 leading-relaxed">
        To accurately track your Reels watch time and show the floating session counter, Android requires 3 specific system permissions.
      </Text>

      {/* Permission Card 1: Usage Access */}
      <View className="p-4 mb-3 rounded-2xl bg-gray-50 border border-gray-200">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center flex-1">
            <Text className="text-xl mr-2">📊</Text>
            <Text className="text-base font-bold text-gray-900 flex-1">Usage Access</Text>
          </View>
          <View
            className={`px-2.5 py-1 rounded-full ${
              permissions.usageAccess ? 'bg-emerald-100' : 'bg-amber-100'
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                permissions.usageAccess ? 'text-emerald-800' : 'text-amber-800'
              }`}
            >
              {permissions.usageAccess ? 'Granted ✓' : 'Needs Setup'}
            </Text>
          </View>
        </View>

        <Text className="text-xs text-gray-600 mb-3 leading-relaxed">
          Allows the app to detect when Instagram is the active foreground application on your phone.
        </Text>

        {!permissions.usageAccess ? (
          <TouchableOpacity
            onPress={requestUsageAccessPermission}
            className="w-full py-2.5 rounded-xl bg-blue-600 items-center active:bg-blue-700"
          >
            <Text className="text-white text-sm font-semibold">Enable in Settings</Text>
          </TouchableOpacity>
        ) : (
          <Text className="text-xs text-emerald-600 font-medium">
            Active and verified
          </Text>
        )}
      </View>

      {/* Permission Card 2: Accessibility Service */}
      <View className="p-4 mb-3 rounded-2xl bg-gray-50 border border-gray-200">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center flex-1">
            <Text className="text-xl mr-2">🎯</Text>
            <Text className="text-base font-bold text-gray-900 flex-1">Accessibility Service</Text>
          </View>
          <View
            className={`px-2.5 py-1 rounded-full ${
              permissions.accessibility ? 'bg-emerald-100' : 'bg-amber-100'
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                permissions.accessibility ? 'text-emerald-800' : 'text-amber-800'
              }`}
            >
              {permissions.accessibility ? 'Granted ✓' : 'Needs Setup'}
            </Text>
          </View>
        </View>

        <Text className="text-xs text-gray-600 mb-3 leading-relaxed">
          Required to distinguish the Reels player from normal feed/DMs and detect vertical swipe transitions between individual Reels.
        </Text>

        {!permissions.accessibility ? (
          <TouchableOpacity
            onPress={requestAccessibilityPermission}
            className="w-full py-2.5 rounded-xl bg-blue-600 items-center active:bg-blue-700"
          >
            <Text className="text-white text-sm font-semibold">Enable Accessibility</Text>
          </TouchableOpacity>
        ) : (
          <Text className="text-xs text-emerald-600 font-medium">
            Active and verified
          </Text>
        )}
      </View>

      {/* Permission Card 3: Display Over Other Apps */}
      <View className="p-4 mb-4 rounded-2xl bg-gray-50 border border-gray-200">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center flex-1">
            <Text className="text-xl mr-2">🫠</Text>
            <Text className="text-base font-bold text-gray-900 flex-1">Display Over Apps</Text>
          </View>
          <View
            className={`px-2.5 py-1 rounded-full ${
              permissions.overlay ? 'bg-emerald-100' : 'bg-amber-100'
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                permissions.overlay ? 'text-emerald-800' : 'text-amber-800'
              }`}
            >
              {permissions.overlay ? 'Granted ✓' : 'Needs Setup'}
            </Text>
          </View>
        </View>

        <Text className="text-xs text-gray-600 mb-3 leading-relaxed">
          Displays the compact session pill badge directly above Instagram so you are aware of your scrolling time.
        </Text>

        {!permissions.overlay ? (
          <TouchableOpacity
            onPress={requestOverlayPermission}
            className="w-full py-2.5 rounded-xl bg-blue-600 items-center active:bg-blue-700"
          >
            <Text className="text-white text-sm font-semibold">Allow Overlay</Text>
          </TouchableOpacity>
        ) : (
          <Text className="text-xs text-emerald-600 font-medium">
            Active and verified
          </Text>
        )}
      </View>

      {/* Technical limitation notice */}
      <View className="p-3 mb-5 rounded-xl bg-amber-50 border border-amber-200">
        <Text className="text-xs text-amber-900 font-semibold mb-1">
          Detection Notice:
        </Text>
        <Text className="text-xs text-amber-800 leading-normal">
          Instagram frequently updates view hierarchies. The tracker uses heuristic layout and scroll node matching. If accessibility is disabled, only general Instagram time will be logged.
        </Text>
      </View>

      {/* Manual refresh / test simulation options */}
      <View className="flex-row items-center justify-between mb-4">
        <TouchableOpacity
          onPress={refreshPermissions}
          disabled={isRefreshing}
          className="px-4 py-2 rounded-xl bg-gray-200 active:bg-gray-300"
        >
          <Text className="text-xs font-semibold text-gray-700">
            {isRefreshing ? 'Checking...' : '🔄 Re-check Status'}
          </Text>
        </TouchableOpacity>

        {/* Emulator/Dev fallback grant-all helper */}
        <TouchableOpacity
          onPress={() => {
            setSimulatedPermission('usageAccess', true);
            setSimulatedPermission('accessibility', true);
            setSimulatedPermission('overlay', true);
            refreshPermissions();
          }}
          className="px-3 py-2 rounded-xl bg-gray-100 border border-gray-300"
        >
          <Text className="text-xs text-gray-600 font-medium">Demo: Grant All</Text>
        </TouchableOpacity>
      </View>

      {/* Continue button */}
      <TouchableOpacity
        onPress={onComplete}
        className={`w-full py-4 rounded-2xl items-center justify-center shadow-sm ${
          allGranted ? 'bg-emerald-600 active:bg-emerald-700' : 'bg-blue-600 active:bg-blue-700'
        }`}
      >
        <Text className="text-white text-base font-bold">
          {allGranted ? 'Complete Setup & Open Dashboard' : 'Continue to Dashboard'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
