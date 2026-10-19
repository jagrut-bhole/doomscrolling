import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import type { DockTabType } from '@/types/componentTypes';

export type DockTab = DockTabType[keyof DockTabType];

interface FloatingDockProps {
  activeTab: DockTab;
}

interface DockItemConfig {
  tab: DockTab;
  label: string;
  iconName: keyof typeof Feather.glyphMap;
}

export const DOCK_ITEMS: DockItemConfig[] = [
  { tab: 'dashboard', label: 'Home', iconName: 'home' },
  { tab: 'sessions', label: 'Sessions', iconName: 'film' },
  { tab: 'profile', label: 'Profile', iconName: 'user' },
];

function DockItem({
  item,
  isActive,
  isAnyActive,
  onPress,
}: {
  item: DockItemConfig;
  isActive: boolean;
  isAnyActive: boolean;
  onPress: () => void;
}) {
  const [isPressed, setIsPressed] = useState(false);
  const isEnlarged = isActive || isPressed;

  // Spring animation configs matching user's framer-motion settings
  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: withSpring(isEnlarged ? 1.35 : 1, {
            damping: 18,
            stiffness: 200,
          }),
        },
        {
          translateY: withSpring(isEnlarged ? -10 : 0, {
            damping: 18,
            stiffness: 200,
          }),
        },
      ],
      opacity: withTiming(isAnyActive && !isActive && !isPressed ? 0.45 : 1, {
        duration: 200,
      }),
    };
  }, [isEnlarged, isAnyActive, isActive, isPressed]);

  const iconAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotateX: withSpring(isEnlarged ? '-10deg' : '0deg', {
            damping: 15,
            stiffness: 150,
          }),
        },
        {
          rotateY: withSpring(isEnlarged ? '8deg' : '0deg', {
            damping: 15,
            stiffness: 150,
          }),
        },
      ],
    };
  }, [isEnlarged]);

  const labelAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isEnlarged ? 1 : 0, { duration: 200 }),
      transform: [
        {
          translateY: withTiming(isEnlarged ? 0 : 5, { duration: 200 }),
        },
      ],
    };
  }, [isEnlarged]);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      className="items-center justify-center px-4 py-2"
    >
      <Animated.View style={[styles.itemContainer, containerAnimatedStyle]}>
        {/* Active background pill highlight */}
        {isActive && (
          <View className="absolute inset-0 -m-1 rounded-2xl bg-blue-50/80 -z-10" />
        )}

        <Animated.View style={iconAnimatedStyle}>
          <Feather
            name={item.iconName}
            size={24}
            color={isActive ? '#2563EB' : '#374151'}
          />
        </Animated.View>

        {/* Floating Label */}
        <Animated.View style={[styles.labelContainer, labelAnimatedStyle]}>
          <Text
            className={`text-[11px] font-bold tracking-wide ${
              isActive ? 'text-blue-600' : 'text-gray-700'
            }`}
          >
            {item.label}
          </Text>
          {isActive && (
            <View className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-0.5" />
          )}
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function FloatingDock({ activeTab }: FloatingDockProps) {
  const router = useRouter();

  const handleNavigate = (tab: DockTab) => {
    if (tab === activeTab) return;

    if (tab === 'dashboard') {
      router.replace('/dashboard' as any);
    } else if (tab === 'sessions') {
      router.replace('/sessions' as any);
    } else if (tab === 'profile') {
      router.replace('/settings' as any);
    }
  };

  return (
    <View pointerEvents="box-none" style={styles.dockWrapper}>
      <Animated.View style={styles.tiltedDock}>
        {DOCK_ITEMS.map((item) => (
          <DockItem
            key={item.tab}
            item={item}
            isActive={activeTab === item.tab}
            isAnyActive={!!activeTab}
            onPress={() => handleNavigate(item.tab)}
          />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  dockWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  tiltedDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.75)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 16,
    // 3D stage tilt effect
    transform: [{ perspective: 1000 }, { rotateX: '14deg' }],
  },
  itemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minWidth: 54,
  },
  labelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: -20,
  },
});
