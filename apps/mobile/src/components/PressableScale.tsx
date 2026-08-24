// Every button: scale to 0.96 on press-in, spring back on release,
// paired with a Light haptic. No exceptions.
//
// The animated element is a View (Reanimated animates it natively); the
// Pressable overlays it so the whole surface is the touch target and all
// accessibility props live on the real pressable.
import React from 'react';
import { Pressable, StyleSheet, type PressableProps, type ViewStyle, type StyleProp } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { spring } from '../theme/motion';
import { tap } from '../lib/haptics';

interface Props extends Omit<PressableProps, 'style' | 'children'> {
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
  children?: React.ReactNode;
}

export function PressableScale({
  style,
  haptic = true,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
      <Pressable
        {...rest}
        style={StyleSheet.absoluteFill}
        onPressIn={(e) => {
          scale.value = withSpring(0.96, spring);
          if (haptic) tap();
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          scale.value = withSpring(1, spring);
          onPressOut?.(e);
        }}
      />
    </Animated.View>
  );
}
