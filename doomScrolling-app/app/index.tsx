import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { getDatabase } from '@/database';
import { hasProfile } from '@/database/repositories/profileRepository';

export default function IndexScreen() {
  const router = useRouter();
  const [loadingText, setLoadingText] = useState('Initializing database...');

  useEffect(() => {
    let isMounted = true;

    async function checkInitialState() {
      try {
        setLoadingText('Loading your profile...');
        await getDatabase();

        const profileExists = await hasProfile();

        if (!isMounted) return;

        if (profileExists) {
          router.replace('/dashboard');
        } else {
          router.replace('/onboarding');
        }
      } catch (error) {
        console.error('Initialization error:', error);
        if (isMounted) {
          setLoadingText('Failed to initialize local storage. Please restart the app.');
        }
      }
    }

    checkInitialState();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-5xl mb-4">🫠</Text>
      <Text className="text-2xl font-extrabold text-gray-900 mb-2">Reels Tracker</Text>
      <ActivityIndicator size="small" color="#2563EB" className="my-4" />
      <Text className="text-sm text-gray-500 font-medium text-center">{loadingText}</Text>
    </View>
  );
}