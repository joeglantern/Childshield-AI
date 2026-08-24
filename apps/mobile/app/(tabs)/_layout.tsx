// Child tab bar — TRUE native tabs (UITabBar on iOS with system translucency,
// Material bottom navigation on Android) via expo-router NativeTabs.
// renderingMode="original" keeps the design's colorful icons untinted.
import React from 'react';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Ionicons } from '@expo/vector-icons';
import { img } from '../../src/assets';
import { useApp } from '../../src/state/AppContext';

export default function ChildTabs() {
  const { t } = useApp();
  return (
    <NativeTabs tintColor="#009C9C" labelStyle={{ fontFamily: 'Manrope_700Bold' }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t.tabs.home}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={img.tab.home} renderingMode="original" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="games">
        <NativeTabs.Trigger.Label>{t.tabs.games}</NativeTabs.Trigger.Label>
        {/* Same no-new-PNG precedent as the officer account tab. */}
        <NativeTabs.Trigger.Icon
          sf={{ default: 'gamecontroller', selected: 'gamecontroller.fill' }}
          src={<Ionicons name="game-controller-outline" size={24} />}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="status">
        <NativeTabs.Trigger.Label>{t.tabs.status}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={img.tab.status} renderingMode="original" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="help">
        <NativeTabs.Trigger.Label>{t.tabs.help}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={img.tab.help} renderingMode="original" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
