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
import { getRecentSessions } from '@/database/repositories/sessionRepository';
import { formatDuration } from '@/services/usageStatistics';
import type { ReelSession } from '@/types/session';
import FloatingDock from '@/components/navigation/FloatingDock';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SessionsScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ReelSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const data = await getRecentSessions(100);
      setSessions(data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await getRecentSessions(100);
        if (!isMounted) return;
        setSessions(data);
      } catch (error) {
        console.error('Failed to load sessions:', error);
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
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSessions();
  }, [loadSessions]);

  const formatTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  const formatDate = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      const today = new Date();
      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      }
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return isoString;
    }
  };

  const totalDurationSeconds = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
  const totalReelsCount = sessions.reduce((sum, s) => sum + (s.reels_count || 0), 0);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="text-sm text-gray-500 font-medium mt-3">Loading sessions history...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" />

      {/* Top Header */}
      <View className="px-6 py-4 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            History & Analytics
          </Text>
          <Text className="text-xl font-extrabold text-gray-900 tracking-tight">
            Scrolling Sessions 📱
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/dashboard')}
          className="w-10 h-10 rounded-2xl bg-gray-100 items-center justify-center active:bg-gray-200"
        >
          <Text className="text-base">🏠</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Quick Stats Grid */}
        <View className="flex-row justify-between mb-5">
          <View className="w-[31%] p-3.5 rounded-2xl bg-white border border-gray-100 shadow-xs items-center">
            <Text className="text-xs font-semibold text-gray-400">Sessions</Text>
            <Text className="text-xl font-black text-gray-900 mt-1">{sessions.length}</Text>
          </View>

          <View className="w-[31%] p-3.5 rounded-2xl bg-white border border-gray-100 shadow-xs items-center">
            <Text className="text-xs font-semibold text-gray-400">Total Time</Text>
            <Text className="text-xl font-black text-blue-600 mt-1">
              {formatDuration(totalDurationSeconds)}
            </Text>
          </View>

          <View className="w-[31%] p-3.5 rounded-2xl bg-white border border-gray-100 shadow-xs items-center">
            <Text className="text-xs font-semibold text-gray-400">Total Reels</Text>
            <Text className="text-xl font-black text-purple-600 mt-1">{totalReelsCount}</Text>
          </View>
        </View>

        {/* Sessions List */}
        <View className="w-full p-5 mb-8 rounded-3xl bg-white border border-gray-100 shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-base font-bold text-gray-900">All Recorded Sessions</Text>
            <Text className="text-xs text-gray-400 font-medium">{sessions.length} sessions</Text>
          </View>

          {sessions.length === 0 ? (
            <View className="py-12 items-center justify-center">
              <Text className="text-4xl mb-3">📱</Text>
              <Text className="text-base font-bold text-gray-800">No sessions recorded</Text>
              <Text className="text-xs text-gray-400 text-center mt-1.5 max-w-[240px]">
                Sessions will automatically appear here when you scroll Reels in Instagram.
              </Text>
            </View>
          ) : (
            <View className="divide-y divide-gray-100">
              {sessions.map((session) => {
                const isActive = !session.ended_at;
                const avgPerReel =
                  session.reels_count > 0
                    ? Math.round(session.duration_seconds / session.reels_count)
                    : 0;

                return (
                  <TouchableOpacity
                    key={session.id}
                    onPress={() => router.push(`/sessions/${session.id}` as any)}
                    activeOpacity={0.7}
                    className="py-4 flex-row items-center justify-between active:bg-gray-50/70 rounded-xl px-1"
                  >
                    <View className="flex-row items-center flex-1 pr-3">
                      <View
                        className={`w-10 h-10 rounded-2xl items-center justify-center mr-3 ${
                          isActive ? 'bg-amber-100' : 'bg-blue-50'
                        }`}
                      >
                        <Text className="text-lg">{isActive ? '⏳' : '📱'}</Text>
                      </View>

                      <View className="flex-1">
                        <View className="flex-row items-center">
                          <Text className="text-sm font-bold text-gray-900">
                            {formatDate(session.started_at)}
                          </Text>
                          {isActive && (
                            <View className="ml-2 px-2 py-0.5 rounded-full bg-amber-100">
                              <Text className="text-[10px] font-bold text-amber-800">ACTIVE</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-xs text-gray-500 mt-0.5">
                          Started at {formatTime(session.started_at)} • {session.reels_count} reels
                        </Text>
                        {avgPerReel > 0 && (
                          <Text className="text-[11px] text-gray-400 mt-0.5">
                            ~{avgPerReel}s per reel
                          </Text>
                        )}
                      </View>
                    </View>

                    <View className="flex-row items-center">
                      <View className="items-end mr-2">
                        <Text className="text-sm font-bold text-gray-900">
                          {formatDuration(session.duration_seconds)}
                        </Text>
                        <Text className="text-[11px] text-gray-400 mt-0.5">
                          {isActive ? 'Ongoing' : 'Completed'}
                        </Text>
                      </View>
                      <Text className="text-gray-300 text-lg">›</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Bottom Dock */}
      <FloatingDock activeTab="sessions" />
    </SafeAreaView>
  );
}
