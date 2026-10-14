import React from 'react';
import { View, Text } from 'react-native';
import type { TodayOverview } from '@/services/usageStatistics';
import { formatDuration } from '@/services/usageStatistics';

interface DailyLimitProgressProps {
  overview: TodayOverview;
}

export default function DailyLimitProgress({ overview }: DailyLimitProgressProps) {
  const isOver = overview.isOverLimit;
  const progressPercent = Math.min(100, overview.progressPercent);

  return (
    <View className="w-full p-5 mb-6 rounded-3xl bg-white border border-gray-100 shadow-sm">
      {/* Title & percentage */}
      <View className="flex-row items-center justify-between mb-3">
        <View>
          <Text className="text-base font-bold text-gray-900">Daily Limit Progress</Text>
          <Text className="text-xs text-gray-500 mt-0.5">
            {formatDuration(overview.totalDurationSeconds)} of {overview.dailyLimitMinutes}m target
          </Text>
        </View>

        <View
          className={`px-3 py-1 rounded-full ${
            isOver ? 'bg-rose-100' : 'bg-blue-100'
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              isOver ? 'text-rose-700' : 'text-blue-700'
            }`}
          >
            {isOver ? 'Limit Exceeded' : `${progressPercent}% Used`}
          </Text>
        </View>
      </View>

      {/* Progress Track */}
      <View className="w-full h-3.5 bg-gray-100 rounded-full overflow-hidden flex-row mb-3">
        <View
          style={{ width: `${progressPercent}%` }}
          className={`h-full rounded-full ${
            isOver ? 'bg-rose-500' : progressPercent > 80 ? 'bg-amber-500' : 'bg-blue-600'
          }`}
        />
      </View>

      {/* Warning / Encouragement text */}
      {isOver ? (
        <View className="p-3 rounded-2xl bg-rose-50 border border-rose-200 flex-row items-center">
          <Text className="text-lg mr-2">🚨</Text>
          <Text className="text-xs text-rose-800 flex-1 leading-relaxed">
            You have scrolled for <Text className="font-bold">{formatDuration(overview.overtimeSeconds)}</Text> past your daily limit. Time to put the phone down!
          </Text>
        </View>
      ) : progressPercent >= 80 ? (
        <View className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex-row items-center">
          <Text className="text-lg mr-2">⏳</Text>
          <Text className="text-xs text-amber-800 flex-1 leading-relaxed">
            Almost at your limit! You have <Text className="font-bold">{formatDuration(overview.timeRemainingSeconds)}</Text> remaining today.
          </Text>
        </View>
      ) : (
        <View className="flex-row items-center justify-between text-xs text-gray-500">
          <Text className="text-xs text-gray-500">
            {formatDuration(overview.timeRemainingSeconds)} left today
          </Text>
          <Text className="text-xs text-emerald-600 font-medium">Within safe pace 🌿</Text>
        </View>
      )}
    </View>
  );
}
