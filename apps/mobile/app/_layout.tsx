import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Baloo2_700Bold, Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { AppProvider, useApp } from '../src/state/AppContext';
import { ReportProvider } from '../src/state/ReportContext';
import { OfficerProvider } from '../src/state/OfficerContext';
import { GamesProvider } from '../src/state/GamesContext';
import { img } from '../src/assets';
import { font, palette } from '../src/theme/tokens';

void SplashScreen.preventAutoHideAsync();

/// SAFEGUARDING (safety UX): when the app is backgrounded, cover content so
/// the app switcher preview never shows report text — only the neutral logo.
function PrivacyShield() {
  const [blurred, setBlurred] = useState(false);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      setBlurred(state !== 'active');
    });
    return () => sub.remove();
  }, []);
  if (!blurred) return null;
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: palette.warmBg, alignItems: 'center', justifyContent: 'center' },
      ]}
      pointerEvents="none"
    >
      <Image source={img.logo} style={{ width: 96, height: 96, resizeMode: 'contain' }} />
    </View>
  );
}

/// SAFEGUARDING (optional app-lock): when enabled in settings, the app
/// requires biometric unlock on cold start and whenever it returns from the
/// background. The lock screen shows only the logo — nothing sensitive.
function LockGate() {
  const { appLockEnabled, t } = useApp();
  const [locked, setLocked] = useState(appLockEnabled);
  const authenticating = useRef(false);

  const unlock = useCallback(async () => {
    if (authenticating.current) return;
    authenticating.current = true;
    try {
      if (Platform.OS === 'web') {
        setLocked(false); // expo-local-authentication has no web implementation
        return;
      }
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !enrolled) {
        setLocked(false); // never lock the child out of help
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t.lock.unlock,
      });
      if (result.success) setLocked(false);
    } finally {
      authenticating.current = false;
    }
  }, [t]);

  useEffect(() => {
    if (!appLockEnabled) {
      setLocked(false);
      return;
    }
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') setLocked(true);
    });
    if (locked) void unlock();
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appLockEnabled, locked]);

  if (!locked) return null;
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: palette.warmBg,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 26,
        },
      ]}
    >
      <Image source={img.logo} style={{ width: 110, height: 110, resizeMode: 'contain' }} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.lock.unlock}
        onPress={() => void unlock()}
        style={{
          backgroundColor: palette.teal,
          borderRadius: 999,
          paddingVertical: 13,
          paddingHorizontal: 38,
        }}
      >
        <Text style={{ fontFamily: font.heading, fontSize: 15.5, color: palette.white }}>
          {t.lock.unlock}
        </Text>
      </Pressable>
    </View>
  );
}

function RootStack() {
  const { isDark, colors } = useApp();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          // Screen transitions are interruptible and track the finger.
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="decoy" options={{ gestureEnabled: false, animation: 'none' }} />
      </Stack>
      <PrivacyShield />
      <LockGate />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <GamesProvider>
            <ReportProvider>
              <OfficerProvider>
                <RootStack />
              </OfficerProvider>
            </ReportProvider>
          </GamesProvider>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
