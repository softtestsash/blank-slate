import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { colors, font } from '../theme';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { NameAgeScreen } from '../screens/Onboarding/NameAgeScreen';
import { CurrentWeightScreen } from '../screens/Onboarding/CurrentWeightScreen';
import { TargetWeightScreen } from '../screens/Onboarding/TargetWeightScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { RitualScreen } from '../screens/RitualScreen';
import { RevealScreen } from '../screens/RevealScreen';
import { useAppStore } from '../store/useAppStore';
import { getProfile } from '../db/db';

// ─── Navigator param lists ────────────────────────────────────────────────────

export type OnboardingStackParamList = {
  NameAge: undefined;
  CurrentWeight: { name: string; age: number; sex: string };
  TargetWeight: {
    name: string;
    age: number;
    sex: string;
    currentWeight: number;
    unit: 'lbs' | 'kg';
  };
};

type MainTabParamList = {
  Dashboard: undefined;
  Ritual: undefined;
  Reveal: undefined;
};

// ─── Navigators ───────────────────────────────────────────────────────────────

const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

// ─── Tab icons (text-based, no icon library dep) ──────────────────────────────

function tabIcon(route: string, focused: boolean): string {
  const icons: Record<string, [string, string]> = {
    Dashboard: ['◉', '○'],
    Ritual:    ['☀', '☼'],
    Reveal:    ['📬', '📭'],
  };
  const [active, inactive] = icons[route] ?? ['●', '○'];
  return focused ? active : inactive;
}

// ─── Main Tabs ────────────────────────────────────────────────────────────────

function MainTabs() {
  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 6,
          height: 68,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 18, color: focused ? colors.accent : colors.textTertiary }}>
            {tabIcon(route.name, focused)}
          </Text>
        ),
        tabBarLabelStyle: { fontSize: 11, fontFamily: font.bodyMedium },
      })}
    >
      <MainTab.Screen name="Dashboard" component={DashboardScreen} />
      <MainTab.Screen name="Ritual" component={RitualScreen} />
      <MainTab.Screen
        name="Reveal"
        component={RevealScreen}
        options={{ tabBarLabel: 'Sunday' }}
      />
    </MainTab.Navigator>
  );
}

// ─── Onboarding Stack ─────────────────────────────────────────────────────────

function OnboardingFlow() {
  return (
    <OnboardingStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
      }}
    >
      <OnboardingStack.Screen name="NameAge" component={NameAgeScreen} />
      <OnboardingStack.Screen name="CurrentWeight" component={CurrentWeightScreen} />
      <OnboardingStack.Screen name="TargetWeight" component={TargetWeightScreen} />
    </OnboardingStack.Navigator>
  );
}

// ─── Root Navigator ───────────────────────────────────────────────────────────

export function AppNavigator() {
  const [loading, setLoading] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const setProfile = useAppStore((s) => s.setProfile);

  useEffect(() => {
    // Safety net: if bootstrap hangs for any reason (AsyncStorage not ready,
    // native module timing on first Expo Go load, etc.) force the spinner off
    // after 5 s so the user isn't stuck on a blank screen.
    const timeout = setTimeout(() => {
      console.warn('[Nav] bootstrap timeout — forcing loading:false');
      setLoading(false);
    }, 5000);

    async function bootstrap() {
      try {
        console.log('[Nav] bootstrap start');
        console.log('[Nav] calling AsyncStorage.getItem...');
        const flag = await AsyncStorage.getItem('hasOnboarded');
        console.log('[Nav] hasOnboarded flag:', flag);

        if (flag === 'true') {
          console.log('[Nav] calling getProfile...');
          const profile = getProfile();
          console.log('[Nav] profile from DB:', profile?.name ?? 'null');
          if (profile) setProfile(profile);
          setHasOnboarded(true);
        }
      } catch (e) {
        console.error('[Nav] bootstrap error:', e);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
        console.log('[Nav] bootstrap complete');
      }
    }
    bootstrap();

    return () => clearTimeout(timeout);
  }, []);

  // Listen for profile being set (i.e. onboarding completion) to switch roots
  const profile = useAppStore((s) => s.profile);
  useEffect(() => {
    if (profile) setHasOnboarded(true);
  }, [profile]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return hasOnboarded ? <MainTabs /> : <OnboardingFlow />;
}
