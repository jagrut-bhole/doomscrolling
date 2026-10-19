import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getSessionById } from '@/database/repositories/sessionRepository';
import { getEventsForSession } from '@/database/repositories/reelEventRepository';
import { formatDuration } from '@/services/usageStatistics';
import type { ReelSession, ReelEvent } from '@/types/session';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SessionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<ReelSession | null>(null);
  const [events, setEvents] = useState<ReelEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSessionDetails = useCallback(async () => {
    if (!id) return;
    const numericId = parseInt(Array.isArray(id) ? id[0] : id, 10);
    if (isNaN(numericId)) return;

    try {
      const [sessionData, eventsData] = await Promise.all([
        getSessionById(numericId),
        getEventsForSession(numericId),
      ]);

      setSession(sessionData);
      setEvents(eventsData);
    } catch (error) {
      console.error('Failed to load session details:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadSessionDetails();
  }, [loadSessionDetails]);

  const formatFullDate = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const formatTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="text-sm text-gray-500 font-medium mt-3">Loading session details...</Text>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center px-6">
        <Text className="text-4xl mb-3">🔍</Text>
        <Text className="text-lg font-bold text-gray-900 mb-1">Session Not Found</Text>
        <Text className="text-sm text-gray-500 text-center mb-6">
          The requested session could not be located in the database.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="px-6 py-3 rounded-2xl bg-blue-600 active:bg-blue-700"
        >
          <Text className="text-sm font-bold text-white">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isActive = !session.ended_at;
  const avgSecondsPerReel =
    session.reels_count > 0 ? Math.round(session.duration_seconds / session.reels_count) : 0;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" />

      {/* Top Header */}
      <View className="px-6 py-4 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-2xl bg-gray-100 items-center justify-center active:bg-gray-200"
        >
          <Text className="text-lg font-bold text-gray-700">‹</Text>
        </TouchableOpacity>

        <View className="items-center">
          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Session Details
          </Text>
          <Text className="text-base font-extrabold text-gray-900">
            Session #{session.id}
          </Text>
        </View>

        <View
          className={`px-2.5 py-1 rounded-full ${
            isActive ? 'bg-amber-100' : 'bg-emerald-100'
          }`}
        >
          <Text
            className={`text-[10px] font-bold ${
              isActive ? 'text-amber-800' : 'text-emerald-800'
            }`}
          >
            {isActive ? 'ACTIVE' : 'COMPLETED'}
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <View className="w-full p-6 mb-5 rounded-3xl bg-blue-600 shadow-md">
          <Text className="text-xs font-bold uppercase tracking-wider text-blue-200 mb-1">
            Total Scrolling Duration
          </Text>
          <Text className="text-4xl font-black text-white mb-4">
            {formatDuration(session.duration_seconds)}
          </Text>

          <View className="flex-row items-center justify-between pt-4 border-t border-blue-500/50">
            <View>
              <Text className="text-xs font-medium text-blue-200">Reels Watched</Text>
              <Text className="text-xl font-black text-white mt-0.5">{session.reels_count}</Text>
            </View>

            <View className="items-end">
              <Text className="text-xs font-medium text-blue-200">Average Pace</Text>
              <Text className="text-xl font-black text-white mt-0.5">
                {avgSecondsPerReel > 0 ? `~${avgSecondsPerReel}s / reel` : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Timing Information */}
        <View className="w-full p-5 mb-5 rounded-3xl bg-white border border-gray-100 shadow-sm">
          <Text className="text-base font-bold text-gray-900 mb-4">Timing & Status</Text>

          <View className="space-y-3">
            <View className="flex-row items-center justify-between py-2 border-b border-gray-50">
              <View className="flex-row items-center">
                <Text className="text-base mr-2.5">📅</Text>
                <Text className="text-sm font-medium text-gray-500">Date</Text>
              </View>
              <Text className="text-sm font-bold text-gray-900">
                {formatFullDate(session.started_at)}
              </Text>
            </View>

            <View className="flex-row items-center justify-between py-2 border-b border-gray-50">
              <View className="flex-row items-center">
                <Text className="text-base mr-2.5">🟢</Text>
                <Text className="text-sm font-medium text-gray-500">Started At</Text>
              </View>
              <Text className="text-sm font-bold text-gray-900">
                {formatTime(session.started_at)}
              </Text>
            </View>

            <View className="flex-row items-center justify-between py-2 border-b border-gray-50">
              <View className="flex-row items-center">
                <Text className="text-base mr-2.5">{isActive ? '⏳' : '🔴'}</Text>
                <Text className="text-sm font-medium text-gray-500">Ended At</Text>
              </View>
              <Text className="text-sm font-bold text-gray-900">
                {session.ended_at ? formatTime(session.ended_at) : 'Still ongoing...'}
              </Text>
            </View>

            <View className="flex-row items-center justify-between py-2">
              <View className="flex-row items-center">
                <Text className="text-base mr-2.5">⚡</Text>
                <Text className="text-sm font-medium text-gray-500">Total Seconds</Text>
              </View>
              <Text className="text-sm font-bold text-gray-900">
                {session.duration_seconds}s
              </Text>
            </View>
          </View>
        </View>

        {/* Reels Timeline / Events */}
        <View className="w-full p-5 mb-6 rounded-3xl bg-white border border-gray-100 shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-base font-bold text-gray-900">Reels Timeline</Text>
            <Text className="text-xs text-gray-400 font-medium">
              {events.length > 0 ? `${events.length} swipe events` : 'Summary recorded'}
            </Text>
          </View>

          {events.length === 0 ? (
            <View className="py-6 items-center justify-center">
              <Text className="text-3xl mb-2">🎞️</Text>
              <Text className="text-sm font-semibold text-gray-700">Summary Session</Text>
              <Text className="text-xs text-gray-400 text-center mt-1 max-w-[260px]">
                {session.reels_count} reels were recorded in this session. Individual swipe timestamps are logged when accessibility events trigger during active watching.
              </Text>
            </View>
          ) : (
            <View className="divide-y divide-gray-100">
              {events.map((event, index) => {
                const prevEvent = index > 0 ? events[index - 1] : null;
                const diffSeconds = prevEvent
                  ? Math.max(
                      0,
                      Math.round(
                        (new Date(event.watched_at).getTime() -
                          new Date(prevEvent.watched_at).getTime()) /
                          1000
                      )
                    )
                  : null;

                return (
                  <View key={event.id} className="py-3 flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="w-7 h-7 rounded-full bg-purple-50 items-center justify-center mr-3">
                        <Text className="text-xs font-bold text-purple-700">#{index + 1}</Text>
                      </View>
                      <View>
                        <Text className="text-xs font-bold text-gray-800">
                          Reel {index + 1}
                        </Text>
                        <Text className="text-[11px] text-gray-400">
                          {formatTime(event.watched_at)}
                        </Text>
                      </View>
                    </View>

                    {diffSeconds !== null && (
                      <View className="px-2.5 py-1 rounded-full bg-gray-100">
                        <Text className="text-[10px] font-semibold text-gray-600">
                          +{diffSeconds}s
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Back Button */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-full py-4 rounded-2xl bg-gray-100 active:bg-gray-200 items-center justify-center"
        >
          <Text className="text-sm font-bold text-gray-700">← Back to All Sessions</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
