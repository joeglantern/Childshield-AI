// Every button: scale to 0.96 on press-in, spring back on release, paired
// with a Light haptic. No exceptions.
//
// ACCESSIBILITY: the pressable IS the styled box, and children render inside
// it. That matters more than it looks. This component previously rendered
// children as a SIBLING of an absolutely-filled Pressable, which meant the
// Pressable had no text descendants — so screen readers had no name to
// derive and announced ~60 buttons across the app as "button", while the
// visible label became a second, separate focus stop. Keep children inside.
//
// It also guarantees the WCAG 2.2 SC 2.5.8 minimum target size (24x24 CSS px;
// we use Apple/Google's stricter 44) by measuring itself and expanding
// hitSlop when the rendered box is smaller. Several close buttons and back
// chevrons are drawn at 34-38px by design.
import React, { useCallback, useState } from 'react';
import {
  Pressable,
  type LayoutChangeEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { spring } from '../theme/motion';
import { tap } from '../lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/// Minimum comfortable touch target (pt). WCAG 2.2 AA asks 24; the platform
/// human-interface guidelines ask 44, and children's motor accuracy is worse
/// than adults', so we hold to 44.
export const MIN_TOUCH_TARGET = 44;

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
  onLayout,
  hitSlop,
  children,
  ...rest
}: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  // Grown only when the box measures under the minimum. hitSlop does not
  // affect layout, so setting it from onLayout cannot loop.
  const [autoSlop, setAutoSlop] = useState(0);
  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      const smallest = Math.min(width, height);
      const needed = smallest > 0 ? Math.max(0, Math.ceil((MIN_TOUCH_TARGET - smallest) / 2)) : 0;
      setAutoSlop((prev) => (prev === needed ? prev : needed));
      onLayout?.(e);
    },
    [onLayout],
  );

  return (
    <AnimatedPressable
      {...rest}
      style={[style, animatedStyle]}
      onLayout={handleLayout}
      hitSlop={hitSlop ?? autoSlop}
      onPressIn={(e) => {
        scale.value = withSpring(0.96, spring);
        if (haptic) tap();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, spring);
        onPressOut?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}
