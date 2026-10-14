import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { createProfile } from '@/database/repositories/profileRepository';
import { updateDailyLimit } from '@/database/repositories/settingsRepository';

interface ProfileFormProps {
  onSuccess: () => void;
}

const PRESET_LIMITS = [15, 30, 45, 60, 90];

export default function ProfileForm({ onSuccess }: ProfileFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dailyLimit, setDailyLimit] = useState(30);
  const [customLimitText, setCustomLimitText] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    let isValid = true;
    setNameError(null);
    setEmailError(null);
    setLimitError(null);

    if (!name.trim()) {
      setNameError('Name is required');
      isValid = false;
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setEmailError('Please enter a valid email address');
        isValid = false;
      }
    }

    const effectiveLimit = isCustom ? parseInt(customLimitText, 10) : dailyLimit;
    if (isNaN(effectiveLimit) || effectiveLimit <= 0) {
      setLimitError('Please select or enter a valid daily limit (e.g. 30 minutes)');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const effectiveLimit = isCustom ? parseInt(customLimitText, 10) : dailyLimit;

      // Persist profile
      await createProfile({
        name: name.trim(),
        email: email.trim() || null,
      });

      // Persist daily limit settings
      await updateDailyLimit(effectiveLimit);

      onSuccess();
    } catch (err: any) {
      setNameError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="w-full">
      {/* Name Input */}
      <View className="mb-4">
        <Text className="text-sm font-semibold text-gray-700 mb-1">
          Your Name <Text className="text-red-500">*</Text>
        </Text>
        <TextInput
          className={`w-full px-4 py-3 rounded-xl border bg-gray-50 text-base text-gray-900 ${
            nameError ? 'border-red-500' : 'border-gray-200'
          }`}
          placeholder="e.g. Alex Johnson"
          placeholderTextColor="#9CA3AF"
          value={name}
          onChangeText={(val) => {
            setName(val);
            if (nameError) setNameError(null);
          }}
          autoCapitalize="words"
        />
        {nameError && <Text className="text-xs text-red-500 mt-1">{nameError}</Text>}
      </View>

      {/* Email Input */}
      <View className="mb-5">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-sm font-semibold text-gray-700">Email Address</Text>
          <Text className="text-xs text-gray-400">Optional</Text>
        </View>
        <TextInput
          className={`w-full px-4 py-3 rounded-xl border bg-gray-50 text-base text-gray-900 ${
            emailError ? 'border-red-500' : 'border-gray-200'
          }`}
          placeholder="alex@example.com"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={(val) => {
            setEmail(val);
            if (emailError) setEmailError(null);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {emailError && <Text className="text-xs text-red-500 mt-1">{emailError}</Text>}
      </View>

      {/* Daily Time Limit Selection */}
      <View className="mb-6">
        <Text className="text-sm font-semibold text-gray-700 mb-1">
          Daily Reels Time Limit <Text className="text-red-500">*</Text>
        </Text>
        <Text className="text-xs text-gray-500 mb-3">
          How much time are you willing to spend watching Reels each day?
        </Text>

        {/* Preset Chips */}
        <View className="flex-row flex-wrap gap-2 mb-3">
          {PRESET_LIMITS.map((mins) => {
            const isSelected = !isCustom && dailyLimit === mins;
            return (
              <TouchableOpacity
                key={mins}
                onPress={() => {
                  setIsCustom(false);
                  setDailyLimit(mins);
                  setLimitError(null);
                }}
                className={`px-4 py-2.5 rounded-full border ${
                  isSelected
                    ? 'bg-blue-600 border-blue-600'
                    : 'bg-white border-gray-200'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    isSelected ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  {mins} min
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            onPress={() => {
              setIsCustom(true);
              setLimitError(null);
            }}
            className={`px-4 py-2.5 rounded-full border ${
              isCustom
                ? 'bg-blue-600 border-blue-600'
                : 'bg-white border-gray-200'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                isCustom ? 'text-white' : 'text-gray-700'
              }`}
            >
              Custom
            </Text>
          </TouchableOpacity>
        </View>

        {/* Custom Input Field */}
        {isCustom && (
          <View className="flex-row items-center mt-2">
            <TextInput
              className="flex-1 px-4 py-2.5 rounded-xl border border-blue-400 bg-blue-50/30 text-base text-gray-900"
              placeholder="e.g. 40"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              value={customLimitText}
              onChangeText={(t) => {
                setCustomLimitText(t);
                if (limitError) setLimitError(null);
              }}
              autoFocus
            />
            <Text className="ml-3 text-sm font-medium text-gray-600">minutes / day</Text>
          </View>
        )}

        {limitError && <Text className="text-xs text-red-500 mt-1">{limitError}</Text>}
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={isSubmitting}
        className="w-full py-4 rounded-2xl bg-blue-600 items-center justify-center shadow-sm active:bg-blue-700"
      >
        <Text className="text-white text-base font-bold">
          {isSubmitting ? 'Saving Profile...' : 'Next: Set Up Permissions'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
