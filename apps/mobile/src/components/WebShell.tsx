// Desktop web layout: the app renders in a centered phone-width column on
// a branded backdrop instead of stretching across the whole monitor.
// Native and narrow (mobile-browser) viewports render children untouched.
import React from 'react';
import { Image, Platform, View, useWindowDimensions } from 'react-native';
import { img } from '../assets';
import { useApp } from '../state/AppContext';
import { WEB_FRAME_MIN_W, WEB_STAGE_MAX_W } from '../lib/layout';
import { palette } from '../theme/tokens';

export function WebShell({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const { isDark } = useApp();

  if (Platform.OS !== 'web' || width < WEB_FRAME_MIN_W) {
    return <>{children}</>;
  }

  const sideW = (width - WEB_STAGE_MAX_W) / 2;

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        backgroundColor: isDark ? '#0A211F' : palette.tealTint,
      }}
    >
      {/* Left backdrop */}
      <View style={{ width: sideW, overflow: 'hidden' }} pointerEvents="none">
        <Image
          source={img.shape.blobLightteal}
          style={{
            position: 'absolute',
            width: 340,
            height: 340,
            left: -90,
            top: -70,
            opacity: isDark ? 0.1 : 0.5,
            resizeMode: 'contain',
          }}
        />
        <Image
          source={img.mascot.welcome}
          style={{
            position: 'absolute',
            width: 190,
            height: 190,
            left: Math.max(24, sideW - 250),
            bottom: 48,
            opacity: isDark ? 0.35 : 0.9,
            resizeMode: 'contain',
            transform: [{ rotate: '-6deg' }],
          }}
        />
      </View>

      {/* The app stage */}
      <View
        style={{
          width: WEB_STAGE_MAX_W,
          height,
          backgroundColor: isDark ? palette.darkSurface : palette.warmBg,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: isDark ? 'rgba(232,242,240,0.08)' : 'rgba(5,66,64,0.1)',
          overflow: 'hidden',
        }}
      >
        {children}
      </View>

      {/* Right backdrop */}
      <View style={{ width: sideW, overflow: 'hidden' }} pointerEvents="none">
        <Image
          source={img.shape.brushAmber}
          style={{
            position: 'absolute',
            width: 260,
            height: 130,
            right: -50,
            top: 70,
            opacity: isDark ? 0.12 : 0.55,
            resizeMode: 'contain',
          }}
        />
        <Image
          source={img.shape.squiggleTeal}
          style={{
            position: 'absolute',
            width: 200,
            height: 110,
            right: Math.max(30, sideW - 280),
            bottom: 90,
            opacity: isDark ? 0.14 : 0.6,
            resizeMode: 'contain',
          }}
        />
      </View>
    </View>
  );
}
