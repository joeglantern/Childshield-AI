// SAFEGUARDING (quick-exit decoy): the quick-exit button lands here. It looks
// like a plain notes app so nothing sensitive shows if someone takes the
// phone. This is intentional, not a dead screen.
//
// Ways out (deliberately quiet):
//  - tapping the "Notes" title 5 times quickly returns to ChildShield
//  - Android back button leaves the app entirely (like a real notes app),
//    it can never navigate back into the report flow
import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SECRET_TAPS = 5;
const TAP_WINDOW_MS = 1600;

export default function Decoy() {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const taps = useRef<number[]>([]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      BackHandler.exitApp();
      return true;
    });
    return () => sub.remove();
  }, []);

  const onTitleTap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((ts) => now - ts < TAP_WINDOW_MS), now];
    if (taps.current.length >= SECRET_TAPS) {
      taps.current = [];
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: insets.top + 14 }}>
      <View
        style={{
          paddingHorizontal: 20,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#EEEEEE',
        }}
      >
        <Pressable onPress={onTitleTap} accessibilityLabel="Notes">
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#222222' }}>Notes</Text>
        </Pressable>
      </View>
      <TextInput
        multiline
        value={text}
        onChangeText={setText}
        placeholder="Write a note…"
        placeholderTextColor="#AAAAAA"
        style={{ flex: 1, padding: 20, fontSize: 15, color: '#333333', textAlignVertical: 'top' }}
      />
    </View>
  );
}
