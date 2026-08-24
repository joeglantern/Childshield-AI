// The signature pixel-dot motif: rounded teal/amber squares in varying sizes.
import React from 'react';
import { View } from 'react-native';
import { palette } from '../theme/tokens';

export function PixelDots({ dark = false }: { dark?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      <View
        style={{
          width: 7,
          height: 7,
          borderRadius: 2,
          backgroundColor: dark ? palette.darkAccent : palette.teal,
        }}
      />
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: palette.amber }} />
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 2,
          backgroundColor: dark ? palette.darkDot : palette.lightTeal,
        }}
      />
    </View>
  );
}
