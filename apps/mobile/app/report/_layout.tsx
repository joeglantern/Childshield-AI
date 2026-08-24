// Report flow stack. SAFEGUARDING: screenshots of report content are
// blocked on Android (FLAG_SECURE) for the whole flow.
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import { useApp } from '../../src/state/AppContext';

export default function ReportLayout() {
  const { colors } = useApp();

  useEffect(() => {
    if (Platform.OS === 'android') {
      void ScreenCapture.preventScreenCaptureAsync('report-flow');
      return () => {
        void ScreenCapture.allowScreenCaptureAsync('report-flow');
      };
    }
    return undefined;
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
