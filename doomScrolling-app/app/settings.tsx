import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getProfile, updateProfile } from '@/database/repositories/profileRepository';
import { getSettings, updateDailyLimit } from '@/database/repositories/settingsRepository';
import { resetUsageHistory, fullResetDatabase } from '@/database';
import {
  checkPermissions,
  requestUsageAccessPermission,
  requestAccessibilityPermission,
  requestOverlayPermission,
  type PermissionsStatus,
} from '@/services/tracking';
import type { UserProfile } from '@/types/profile';
import type { AppSettings } from '@/types/settings';
import FloatingDock from '@/components/navigation/FloatingDock';
import { syncLocalDataToBackend } from '@/services/syncService';
import { SafeAreaView } from 'react-native-safe-area-context';
const PRESET_LIMITS = [15, 30, 45, 60, 90];

export default function SettingsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [permissions, setPermissions] = useState<PermissionsStatus | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dailyLimit, setDailyLimit] = useState(30);
  const [customLimitText, setCustomLimitText] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSettingsData = useCallback(async () => {
    try {
      const [uProfile, uSettings, uPerms] = await Promise.all([
        getProfile(),
        getSettings(),
        checkPermissions(),
      ]);

      if (uProfile) {
        setProfile(uProfile);
        setName(uProfile.name);
        setEmail(uProfile.email || '');
      }

      if (uSettings) {
        setSettings(uSettings);
        setDailyLimit(uSettings.daily_limit_minutes);
        if (!PRESET_LIMITS.includes(uSettings.daily_limit_minutes)) {
          setIsCustom(true);
          setCustomLimitText(uSettings.daily_limit_minutes.toString());
        }
      }

      setPermissions(uPerms);
    } catch (e) {
      console.error('Error loading settings:', e);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [uProfile, uSettings, uPerms] = await Promise.all([
          getProfile(),
          getSettings(),
          checkPermissions(),
        ]);
        if (!isMounted) return;

        if (uProfile) {
          setProfile(uProfile);
          setName(uProfile.name);
          setEmail(uProfile.email || '');
        }

        if (uSettings) {
          setSettings(uSettings);
          setDailyLimit(uSettings.daily_limit_minutes);
          if (!PRESET_LIMITS.includes(uSettings.daily_limit_minutes)) {
            setIsCustom(true);
            setCustomLimitText(uSettings.daily_limit_minutes.toString());
          }
        }

        setPermissions(uPerms);
      } catch (e) {
        console.error('Error loading settings:', e);
      }
    })();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkPermissions().then((status) => {
          if (isMounted) setPermissions(status);
        });
      }
    });

    return () => {
      isMounted = false;
      sub.remove();
    };
  }, []);

  const handleSaveProfileAndLimit = async () => {
    setErrorMessage(null);
    setSaveSuccess(false);

    if (!name.trim()) {
      setErrorMessage('Name cannot be empty');
      return;
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setErrorMessage('Please enter a valid email address');
        return;
      }
    }

    const effectiveLimit = isCustom ? parseInt(customLimitText, 10) : dailyLimit;
    if (isNaN(effectiveLimit) || effectiveLimit <= 0) {
      setErrorMessage('Daily limit must be greater than 0 minutes');
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim() || null,
      });

      await updateDailyLimit(effectiveLimit);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      await loadSettingsData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetHistory = () => {
    Alert.alert(
      'Reset Usage History',
      'Are you sure you want to clear all recorded sessions and reels count? Your profile and daily limit target will NOT be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset History',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetUsageHistory();
              Alert.alert('Success', 'Usage history has been reset.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to reset history');
            }
          },
        },
      ]
    );
  };

  const handleFullReset = () => {
    Alert.alert(
      'Full Application Reset',
      'This will delete your profile, daily limit preferences, and all recorded usage history. You will be taken back to onboarding.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await fullResetDatabase();
              router.replace('/onboarding');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to wipe database');
            }
          },
        },
      ]
    );
  };

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncCloud = async () => {
    setIsSyncing(true);
    try {
      const res = await syncLocalDataToBackend();
      if (res.success) {
        Alert.alert(
          'Sync Complete ☁️',
          `Reconciled ${res.syncedSessions} sessions and ${res.syncedEvents} reel events with MongoDB!`
        );
      } else {
        Alert.alert('Sync Notice', res.error || 'Could not sync to server');
      }
    } catch (err: any) {
      Alert.alert('Sync Failed', err.message || 'An error occurred during sync');
    } finally {
      setIsSyncing(false);
    }
  };

  if (!profile || !settings) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View className="px-6 py-4 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => router.back()}
          className="px-3 py-1.5 rounded-xl bg-gray-100 active:bg-gray-200"
        >
          <Text className="text-sm font-semibold text-gray-700">← Back</Text>
        </TouchableOpacity>
        <Text className="text-lg font-extrabold text-gray-900">Settings & Profile</Text>
        <View className="w-12" />
      </View>

      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: 150 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View className="p-5 mb-5 rounded-3xl bg-white border border-gray-100 shadow-sm">
          <Text className="text-base font-bold text-gray-900 mb-4">Profile Information</Text>

          <View className="mb-4">
            <Text className="text-xs font-semibold text-gray-700 mb-1">Your Name</Text>
            <TextInput
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View className="mb-4">
            <Text className="text-xs font-semibold text-gray-700 mb-1">Email (Optional)</Text>
            <TextInput
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Daily Limit Configuration */}
          <View className="mb-4">
            <Text className="text-xs font-semibold text-gray-700 mb-1">Daily Reels Limit</Text>
            <View className="flex-row flex-wrap gap-2 mb-2">
              {PRESET_LIMITS.map((mins) => {
                const isSelected = !isCustom && dailyLimit === mins;
                return (
                  <TouchableOpacity
                    key={mins}
                    onPress={() => {
                      setIsCustom(false);
                      setDailyLimit(mins);
                    }}
                    className={`px-3 py-1.5 rounded-full border ${
                      isSelected ? 'bg-blue-600 border-blue-600' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        isSelected ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      {mins}m
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                onPress={() => setIsCustom(true)}
                className={`px-3 py-1.5 rounded-full border ${
                  isCustom ? 'bg-blue-600 border-blue-600' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    isCustom ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  Custom
                </Text>
              </TouchableOpacity>
            </View>

            {isCustom && (
              <View className="flex-row items-center mt-2">
                <TextInput
                  className="flex-1 px-4 py-2 rounded-xl border border-blue-400 bg-blue-50/20 text-sm text-gray-900"
                  keyboardType="number-pad"
                  value={customLimitText}
                  onChangeText={setCustomLimitText}
                />
                <Text className="ml-2 text-xs font-medium text-gray-500">minutes / day</Text>
              </View>
            )}
          </View>

          {errorMessage && (
            <Text className="text-xs text-red-500 mb-3">{errorMessage}</Text>
          )}

          {saveSuccess && (
            <Text className="text-xs text-emerald-600 font-bold mb-3">
              Settings updated successfully ✓
            </Text>
          )}

          <TouchableOpacity
            onPress={handleSaveProfileAndLimit}
            disabled={isSaving}
            className="w-full py-3 rounded-xl bg-blue-600 items-center justify-center active:bg-blue-700"
          >
            <Text className="text-white text-sm font-bold">
              {isSaving ? 'Saving Changes...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Permissions Overview Card */}
        <View className="p-5 mb-5 rounded-3xl bg-white border border-gray-100 shadow-sm">
          <Text className="text-base font-bold text-gray-900 mb-3">System Permissions</Text>

          {/* Usage Access */}
          <View className="py-2.5 flex-row items-center justify-between border-b border-gray-100">
            <View className="flex-1 pr-2">
              <Text className="text-sm font-semibold text-gray-800">Usage Access</Text>
              <Text className="text-xs text-gray-500">Detects Instagram foreground launch</Text>
            </View>
            {permissions?.usageAccess ? (
              <Text className="text-xs font-bold text-emerald-600">Granted ✓</Text>
            ) : (
              <TouchableOpacity
                onPress={requestUsageAccessPermission}
                className="px-3 py-1 rounded-lg bg-blue-50"
              >
                <Text className="text-xs font-bold text-blue-600">Enable</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Accessibility Service */}
          <View className="py-2.5 flex-row items-center justify-between border-b border-gray-100">
            <View className="flex-1 pr-2">
              <Text className="text-sm font-semibold text-gray-800">Accessibility Service</Text>
              <Text className="text-xs text-gray-500">Tracks Reels screen & transitions</Text>
            </View>
            {permissions?.accessibility ? (
              <Text className="text-xs font-bold text-emerald-600">Granted ✓</Text>
            ) : (
              <TouchableOpacity
                onPress={requestAccessibilityPermission}
                className="px-3 py-1 rounded-lg bg-blue-50"
              >
                <Text className="text-xs font-bold text-blue-600">Enable</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Display Over Apps */}
          <View className="py-2.5 flex-row items-center justify-between">
            <View className="flex-1 pr-2">
              <Text className="text-sm font-semibold text-gray-800">Display Over Apps</Text>
              <Text className="text-xs text-gray-500">Shows floating counter badge</Text>
            </View>
            {permissions?.overlay ? (
              <Text className="text-xs font-bold text-emerald-600">Granted ✓</Text>
            ) : (
              <TouchableOpacity
                onPress={requestOverlayPermission}
                className="px-3 py-1 rounded-lg bg-blue-50"
              >
                <Text className="text-xs font-bold text-blue-600">Enable</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Data & History Management */}
        <View className="p-5 mb-8 rounded-3xl bg-white border border-gray-100 shadow-sm">
          <Text className="text-base font-bold text-gray-900 mb-2">History & Storage</Text>
          <Text className="text-xs text-gray-500 mb-4 leading-relaxed">
            All your data is stored locally in SQLite on this device. No information is uploaded to any server or cloud.
          </Text>

          <TouchableOpacity
            onPress={handleSyncCloud}
            disabled={isSyncing}
            className="w-full py-3 mb-3 rounded-xl border border-blue-200 bg-blue-50/70 items-center justify-center active:bg-blue-100 flex-row"
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#2563EB" className="mr-2" />
            ) : (
              <Text className="text-base mr-1.5">☁️</Text>
            )}
            <Text className="text-blue-600 text-sm font-bold">
              {isSyncing ? 'Reconciling with Server...' : 'Sync SQLite Data to Cloud (MongoDB)'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleResetHistory}
            className="w-full py-3 mb-3 rounded-xl border border-rose-200 bg-rose-50/50 items-center justify-center active:bg-rose-100"
          >
            <Text className="text-rose-600 text-sm font-bold">Reset Usage History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleFullReset}
            className="w-full py-3 rounded-xl border border-gray-200 bg-gray-50 items-center justify-center active:bg-gray-100"
          >
            <Text className="text-gray-600 text-xs font-semibold">Full App Reset (Wipe Profile)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Floating Bottom Dock */}
      <FloatingDock activeTab="profile" />
    </SafeAreaView>
  );
}
