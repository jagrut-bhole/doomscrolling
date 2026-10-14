import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import type { HourlyUsage, DailyUsage } from '@/services/usageStatistics';

interface UsageChartProps {
  hourlyUsage: HourlyUsage[];
  last7DaysUsage: DailyUsage[];
}

type ChartTab = 'hourly' | 'daily_time' | 'daily_reels';

export default function UsageChart({ hourlyUsage, last7DaysUsage }: UsageChartProps) {
  const [activeTab, setActiveTab] = useState<ChartTab>('daily_time');

  // Filter hourly to active hours or sample every 2-3 hours for clean rendering
  const maxHourlyMinutes = Math.max(1, ...hourlyUsage.map((h) => h.durationMinutes));
  const maxDailyMinutes = Math.max(1, ...last7DaysUsage.map((d) => d.durationMinutes));
  const maxDailyReels = Math.max(1, ...last7DaysUsage.map((d) => d.reelsCount));

  return (
    <View className="w-full p-5 mb-6 rounded-3xl bg-white border border-gray-100 shadow-sm">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-base font-bold text-gray-900">Usage Analytics</Text>
      </View>

      {/* Tab Switcher */}
      <View className="flex-row p-1 mb-5 rounded-2xl bg-gray-100">
        <TouchableOpacity
          onPress={() => setActiveTab('daily_time')}
          className={`flex-1 py-2 items-center rounded-xl ${
            activeTab === 'daily_time' ? 'bg-white shadow-xs' : ''
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              activeTab === 'daily_time' ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            7 Days (Time)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('daily_reels')}
          className={`flex-1 py-2 items-center rounded-xl ${
            activeTab === 'daily_reels' ? 'bg-white shadow-xs' : ''
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              activeTab === 'daily_reels' ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            7 Days (Reels)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('hourly')}
          className={`flex-1 py-2 items-center rounded-xl ${
            activeTab === 'hourly' ? 'bg-white shadow-xs' : ''
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              activeTab === 'hourly' ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            Today (Hourly)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Chart View */}
      {activeTab === 'daily_time' && (
        <View>
          <View className="h-44 flex-row items-end justify-between px-2 pt-6 pb-2 border-b border-gray-100">
            {last7DaysUsage.map((day) => {
              const heightPercent = Math.min(
                100,
                Math.max(8, Math.round((day.durationMinutes / maxDailyMinutes) * 100))
              );
              const isOvertime = day.overtimeMinutes > 0;

              return (
                <View key={day.dateIso} className="flex-1 items-center justify-end h-full mx-1">
                  {day.durationMinutes > 0 && (
                    <Text className="text-[10px] font-bold text-gray-500 mb-1">
                      {day.durationMinutes}m
                    </Text>
                  )}
                  <View
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full max-w-[28px] rounded-t-lg ${
                      isOvertime ? 'bg-rose-500' : day.durationMinutes > 0 ? 'bg-blue-600' : 'bg-gray-100'
                    }`}
                  />
                </View>
              );
            })}
          </View>
          <View className="flex-row justify-between px-2 mt-2">
            {last7DaysUsage.map((day) => (
              <View key={day.dateIso} className="flex-1 items-center mx-1">
                <Text className="text-[11px] font-semibold text-gray-600">{day.dayLabel}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {activeTab === 'daily_reels' && (
        <View>
          <View className="h-44 flex-row items-end justify-between px-2 pt-6 pb-2 border-b border-gray-100">
            {last7DaysUsage.map((day) => {
              const heightPercent = Math.min(
                100,
                Math.max(8, Math.round((day.reelsCount / maxDailyReels) * 100))
              );

              return (
                <View key={day.dateIso} className="flex-1 items-center justify-end h-full mx-1">
                  {day.reelsCount > 0 && (
                    <Text className="text-[10px] font-bold text-purple-600 mb-1">
                      {day.reelsCount}
                    </Text>
                  )}
                  <View
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full max-w-[28px] rounded-t-lg ${
                      day.reelsCount > 0 ? 'bg-purple-600' : 'bg-gray-100'
                    }`}
                  />
                </View>
              );
            })}
          </View>
          <View className="flex-row justify-between px-2 mt-2">
            {last7DaysUsage.map((day) => (
              <View key={day.dateIso} className="flex-1 items-center mx-1">
                <Text className="text-[11px] font-semibold text-gray-600">{day.dayLabel}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {activeTab === 'hourly' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pt-2">
          <View className="flex-row items-end h-44 px-2 pb-2 border-b border-gray-100">
            {hourlyUsage.map((h) => {
              const heightPercent = Math.min(
                100,
                Math.max(6, Math.round((h.durationMinutes / maxHourlyMinutes) * 100))
              );

              return (
                <View key={h.hour} className="items-center justify-end h-full w-12 mx-1">
                  {h.durationMinutes > 0 && (
                    <Text className="text-[9px] font-bold text-gray-500 mb-1">
                      {h.durationMinutes}m
                    </Text>
                  )}
                  <View
                    style={{ height: `${heightPercent}%` }}
                    className={`w-7 rounded-t-md ${
                      h.durationMinutes > 0 ? 'bg-blue-500' : 'bg-gray-100'
                    }`}
                  />
                  <Text className="text-[10px] font-medium text-gray-400 mt-2">
                    {h.label.split(' ')[0]}
                    <Text className="text-[8px]">{h.label.split(' ')[1]}</Text>
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
