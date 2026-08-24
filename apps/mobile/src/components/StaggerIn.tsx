// List items stagger in: 40ms delay per index, translateY 20 -> 0 + opacity,
// spring. Used by queue cards and option lists.
import React, { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import type { StyleProp, ViewStyle } from 'react-native';
import { spring, STAGGER_MS } from '../theme/motion';

interface Props {
  index: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function StaggerIn({ index, children, style }: Props) {
  const reduced = useReducedMotion();
  const ty = useSharedValue(reduced ? 0 : 20);
  const opacity = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) return;
    const delay = index * STAGGER_MS;
    ty.value = withDelay(delay, withSpring(0, spring));
    opacity.value = withDelay(delay, withSpring(1, spring));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: ty.value }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
