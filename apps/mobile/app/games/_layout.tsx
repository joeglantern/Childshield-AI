// Gameplay stack — separate from the tab group so full-screen games hide
// the tab bar (mirrors report/_layout.tsx). Nothing here is sensitive, so
// no screen-capture guard.
import React from 'react';
import { Stack } from 'expo-router';
import { useApp } from '../../src/state/AppContext';

export default function GamesLayout() {
  const { colors } = useApp();

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
