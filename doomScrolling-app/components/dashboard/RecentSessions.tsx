import React from 'react';
import { View, Text } from 'react-native';
import type { ReelSession } from '@/types/session';
import { formatDuration } from '@/services/usageStatistics';

interface RecentSessionsProps {
  sessions: ReelSession[];
}

export default function RecentSessions({ sessions }: RecentSessionsProps) {
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
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return isoString;
    }
  };

  return (
    <View className="w-full p-5 mb-8 rounded-3xl bg-white border border-gray-100 shadow-sm">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-base font-bold text-gray-900">Recent Scrolling Sessions</Text>
        <Text className="text-xs text-gray-400 font-medium">{sessions.length} recorded</Text>
      </View>

      {sessions.length === 0 ? (
        <View className="py-8 items-center justify-center">
          <Text className="text-3xl mb-2">🌿</Text>
          <Text className="text-sm font-semibold text-gray-700">No sessions recorded yet</Text>
          <Text className="text-xs text-gray-400 text-center mt-1 max-w-[240px]">
            Sessions will appear here once Instagram Reels are opened with permissions enabled.
          </Text>
        </View>
      ) : (
        <View className="divide-y divide-gray-100">
          {sessions.map((session) => {
            const isActive = !session.ended_at;

            return (
              <View key={session.id} className="py-3.5 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 pr-3">
                  <View
                    className={`w-9 h-9 rounded-xl items-center justify-center mr-3 ${
                      isActive ? 'bg-amber-100' : 'bg-gray-100'
                    }`}
                  >
                    <Text className="text-base">{isActive ? '⏳' : '📱'}</Text>
                  </View>

                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text className="text-sm font-semibold text-gray-900">
                        {formatDate(session.started_at)} at {formatTime(session.started_at)}
                      </Text>
                      {isActive && (
                        <View className="ml-2 px-2 py-0.5 rounded-full bg-amber-100">
                          <Text className="text-[10px] font-bold text-amber-800">ACTIVE</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-xs text-gray-500 mt-0.5">
                      {session.reels_count} reels watched
                    </Text>
                  </View>
                </View>

                <View className="items-end">
                  <Text className="text-sm font-bold text-gray-900">
                    {formatDuration(session.duration_seconds)}
                  </Text>
                  <Text className="text-[11px] text-gray-400 mt-0.5">
                    {isActive ? 'Ongoing' : 'Completed'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
