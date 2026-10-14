import React, { useState } from 'react';
import { View, Text, SafeAreaView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import ProfileForm from '@/components/onboarding/ProfileForm';
import PermissionSetup from '@/components/onboarding/PermissionSetup';

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<'profile' | 'permissions'>('profile');

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      <View className="flex-1 px-6 pt-6 pb-4">
        {/* Header */}
        <View className="mb-6">
          <View className="flex-row items-center mb-2">
            <Text className="text-3xl mr-2">🫠</Text>
            <Text className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Reels Tracker
            </Text>
          </View>
          <Text className="text-sm text-gray-500 font-medium">
            {currentStep === 'profile'
              ? 'Step 1 of 2: Create your profile & limit'
              : 'Step 2 of 2: Enable tracking permissions'}
          </Text>

          {/* Step Progress Bar */}
          <View className="w-full h-1.5 bg-gray-100 rounded-full mt-3 overflow-hidden flex-row">
            <View
              className={`h-full bg-blue-600 rounded-full ${
                currentStep === 'profile' ? 'w-1/2' : 'w-full'
              }`}
            />
          </View>
        </View>

        {/* Content */}
        <View className="flex-1">
          {currentStep === 'profile' ? (
            <ProfileForm onSuccess={() => setCurrentStep('permissions')} />
          ) : (
            <PermissionSetup
              onComplete={() => {
                router.replace('/dashboard');
              }}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
