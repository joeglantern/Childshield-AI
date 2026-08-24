// Web child tabs. NativeTabs' web renderer draws labels only, so web gets
// its own floating pill bar with the same colorful icons as the native
// bars. Tab screens leave headroom for it via WEB_TAB_INSET.
import React from 'react';
import { Image, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { img } from '../../src/assets';
import { PressableScale } from '../../src/components/PressableScale';
import { useApp } from '../../src/state/AppContext';
import { font, palette } from '../../src/theme/tokens';

interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: { navigate: (name: string) => void };
}

const ICONS: Record<string, number | undefined> = {
  index: img.tab.home,
  games: undefined, // Ionicons controller, same as the native trigger
  status: img.tab.status,
  help: img.tab.help,
};

function WebTabBar({ state, navigation }: TabBarProps) {
  const { t } = useApp();
  const labels: Record<string, string> = {
    index: t.tabs.home,
    games: t.tabs.games,
    status: t.tabs.status,
    help: t.tabs.help,
  };
  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', top: 12, left: 0, right: 0, alignItems: 'center' }}
    >
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: '#10302D',
          borderRadius: 999,
          padding: 5,
          gap: 2,
        }}
      >
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const icon = ICONS[route.name];
          return (
            <PressableScale
              key={route.key}
              accessibilityRole="button"
              accessibilityLabel={labels[route.name]}
              onPress={() => navigation.navigate(route.name)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 7,
                paddingVertical: 8,
                paddingHorizontal: 15,
                borderRadius: 999,
                backgroundColor: focused ? 'rgba(255,255,255,0.12)' : 'transparent',
              }}
            >
              {icon !== undefined ? (
                <Image
                  source={icon}
                  style={{
                    width: 21,
                    height: 21,
                    resizeMode: 'contain',
                    opacity: focused ? 1 : 0.8,
                  }}
                />
              ) : (
                <Ionicons
                  name={focused ? 'game-controller' : 'game-controller-outline'}
                  size={20}
                  color={focused ? palette.darkAccent : '#9CC4C1'}
                />
              )}
              <Text
                style={{
                  fontFamily: focused ? font.bodyBold : font.bodySemi,
                  fontSize: 13.5,
                  color: focused ? palette.darkAccent : '#B8CFCC',
                }}
              >
                {labels[route.name]}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

export default function ChildTabsWeb() {
  return (
    <Tabs tabBar={(p) => <WebTabBar {...p} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="games" />
      <Tabs.Screen name="status" />
      <Tabs.Screen name="help" />
    </Tabs>
  );
}
