import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getProfile } from '@/database/repositories/profileRepository';
import { getDashboardData, type DashboardData } from '@/services/usageStatistics';
import { checkPermissions, recordSimulatedSession, type PermissionsStatus } from '@/services/tracking';
import type { UserProfile } from '@/types/profile';
import UsageSummary from '@/components/dashboard/UsageSummary';
import DailyLimitProgress from '@/components/dashboard/DailyLimitProgress';
import UsageChart from '@/components/dashboard/UsageChart';
import RecentSessions from '@/components/dashboard/RecentSessions';
import FloatingDock from '@/components/navigation/FloatingDock';
import { SafeAreaView } from 'react-native-safe-area-context';
export default function DashboardScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [permissions, setPermissions] = useState<PermissionsStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [userProfile, data, permStatus] = await Promise.all([
        getProfile(),
        getDashboardData(),
        checkPermissions(),
      ]);

      if (!userProfile) {
        router.replace('/onboarding');
        return;
      }

      setProfile(userProfile);
      setDashboardData(data);
      setPermissions(permStatus);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [userProfile, data, permStatus] = await Promise.all([
          getProfile(),
          getDashboardData(),
          checkPermissions(),
        ]);

        if (!isMounted) return;

        if (!userProfile) {
          router.replace('/onboarding');
          return;
        }

        setProfile(userProfile);
        setDashboardData(data);
        setPermissions(permStatus);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setRefreshing(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleSimulateSession = async () => {
    // Generates a sample 15m session with 22 reels for rapid validation
    await recordSimulatedSession(900, 22);
    await loadData();
  };

  if (isLoading || !dashboardData) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="text-sm text-gray-500 font-medium mt-3">Loading usage statistics...</Text>
      </SafeAreaView>
    );
  }

  const hasMissingPermissions =
    permissions && (!permissions.usageAccess || !permissions.accessibility || !permissions.overlay);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />

      {/* Top Header */}
      <View className="px-6 py-4 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Reels Tracker
          </Text>
          <Text className="text-xl font-extrabold text-gray-900 tracking-tight" numberOfLines={1}>
            Hello, {profile?.name || 'Friend'} 👋
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/settings')}
          className="w-10 h-10 rounded-2xl bg-gray-100 items-center justify-center active:bg-gray-200"
        >
          <Text className="text-lg">⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: 150 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Permission warning banner if setup incomplete */}
        {hasMissingPermissions && (
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            className="w-full p-4 mb-5 rounded-2xl bg-amber-50 border border-amber-200 flex-row items-center justify-between"
          >
            <View className="flex-1 pr-3">
              <Text className="text-xs font-bold text-amber-900 mb-0.5">
                Tracking Permissions Needed ⚠️
              </Text>
              <Text className="text-xs text-amber-800 leading-normal">
                Some Android permissions are disabled. Tap to review setup.
              </Text>
            </View>
            <View className="px-3 py-1.5 rounded-xl bg-amber-600">
              <Text className="text-xs font-bold text-white">Review</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* 1. Today's Overview Grid */}
        <UsageSummary overview={dashboardData.today} />

        {/* 2. Daily Limit Progress */}
        <DailyLimitProgress overview={dashboardData.today} />

        {/* 3. Analytics Charts */}
        <UsageChart
          hourlyUsage={dashboardData.hourlyUsage}
          last7DaysUsage={dashboardData.last7DaysUsage}
        />

        {/* 4. Recent Activity */}
        <RecentSessions sessions={dashboardData.recentSessions} />

        {/* Development / Testing Quick Action */}
        <View className="mb-6 p-4 rounded-2xl bg-white border border-dashed border-gray-300 items-center">
          <Text className="text-xs font-semibold text-gray-500 mb-2">Test Session Simulator</Text>
          <TouchableOpacity
            onPress={handleSimulateSession}
            className="px-4 py-2 rounded-xl bg-gray-100 border border-gray-200 active:bg-gray-200"
          >
            <Text className="text-xs font-bold text-gray-700">
              + Simulate 15 min Reels Session (22 Reels)
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Floating Bottom Dock */}
      <FloatingDock activeTab="dashboard" />
    </SafeAreaView>
  );
}
