import React from 'react';
import { View, Text } from 'react-native';
import type { TodayOverview } from '@/services/usageStatistics';
import { formatDuration } from '@/services/usageStatistics';

interface UsageSummaryProps {
  overview: TodayOverview;
}

export default function UsageSummary({ overview }: UsageSummaryProps) {
  const isOver = overview.isOverLimit;

  return (
    <View className="flex-row flex-wrap justify-between gap-y-3 mb-6">
      {/* 1. Time Watched Today */}
      <View className="w-[48%] p-4 rounded-2xl bg-blue-50/60 border border-blue-100">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-xs font-bold uppercase tracking-wider text-blue-700">
            Time Watched
          </Text>
          <Text className="text-base">⏱️</Text>
        </View>
        <Text className="text-2xl font-black text-gray-900">
          {formatDuration(overview.totalDurationSeconds)}
        </Text>
        <Text className="text-xs text-gray-500 mt-1">{"Today's Reels"}</Text>
      </View>

      {/* 2. Reels Count */}
      <View className="w-[48%] p-4 rounded-2xl bg-purple-50/60 border border-purple-100">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-xs font-bold uppercase tracking-wider text-purple-700">
            Reels Watched
          </Text>
          <Text className="text-base">🫠</Text>
        </View>
        <Text className="text-2xl font-black text-gray-900">
          {overview.reelsCount}
        </Text>
        <Text className="text-xs text-gray-500 mt-1">Transitions</Text>
      </View>

      {/* 3. Time Remaining OR Overtime */}
      <View
        className={`w-[48%] p-4 rounded-2xl border ${
          isOver
            ? 'bg-rose-50/70 border-rose-200'
            : 'bg-emerald-50/60 border-emerald-100'
        }`}
      >
        <View className="flex-row items-center justify-between mb-2">
          <Text
            className={`text-xs font-bold uppercase tracking-wider ${
              isOver ? 'text-rose-700' : 'text-emerald-700'
            }`}
          >
            {isOver ? 'Overtime' : 'Remaining'}
          </Text>
          <Text className="text-base">{isOver ? '⚠️' : '🌿'}</Text>
        </View>
        <Text
          className={`text-2xl font-black ${
            isOver ? 'text-rose-600' : 'text-emerald-700'
          }`}
        >
          {isOver
            ? `+${formatDuration(overview.overtimeSeconds)}`
            : formatDuration(overview.timeRemainingSeconds)}
        </Text>
        <Text className="text-xs text-gray-500 mt-1">
          {isOver ? 'Past daily limit' : 'Under daily limit'}
        </Text>
      </View>

      {/* 4. Daily Limit Target */}
      <View className="w-[48%] p-4 rounded-2xl bg-gray-50 border border-gray-200">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-xs font-bold uppercase tracking-wider text-gray-600">
            Daily Goal
          </Text>
          <Text className="text-base">🎯</Text>
        </View>
        <Text className="text-2xl font-black text-gray-900">
          {overview.dailyLimitMinutes}m
        </Text>
        <Text className="text-xs text-gray-500 mt-1">Target allowance</Text>
      </View>
    </View>
  );
}
