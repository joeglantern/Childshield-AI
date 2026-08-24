// Officer tab bar — native tabs: Foleni / Takwimu / Akaunti.
import React from 'react';
import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Ionicons } from '@expo/vector-icons';
import { img } from '../../../src/assets';
import { useApp } from '../../../src/state/AppContext';
import { useOfficer } from '../../../src/state/OfficerContext';

export default function OfficerTabs() {
  const { t } = useApp();
  const { session } = useOfficer();

  if (!session) return <Redirect href="/officer/login" />;

  return (
    <NativeTabs tintColor="#009C9C" labelStyle={{ fontFamily: 'Manrope_700Bold' }}>
      <NativeTabs.Trigger name="queue">
        <NativeTabs.Trigger.Label>{t.tabs.queue}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={img.tab.inbox} renderingMode="original" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="stats">
        <NativeTabs.Trigger.Label>{t.tabs.stats}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={img.tab.chart} renderingMode="original" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>{t.tabs.account}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          src={<Ionicons name="person-circle-outline" size={24} />}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
