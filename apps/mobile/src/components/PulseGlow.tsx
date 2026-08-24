// Active status step: soft amber glow ring pulsing on a ~2.2s loop.
// Implemented as a scaling/fading ring behind the tile (looping springs).
import React, { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

const pulseSpring = { damping: 16, stiffness: 20 };

interface Props {
  size: number;
  radius: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function PulseGlow({ size, radius, children, style }: Props) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.25);

  useEffect(() => {
    if (reduced) return; // static soft ring is the reduced-motion variant
    scale.value = withRepeat(
      withSequence(withSpring(1.45, pulseSpring), withSpring(1, pulseSpring)),
      -1,
    );
    opacity.value = withRepeat(
      withSequence(withSpring(0.08, pulseSpring), withSpring(0.25, pulseSpring)),
      -1,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            inset: 0,
            borderRadius: radius,
            backgroundColor: 'rgba(252,156,36,0.35)',
          },
          ringStyle,
        ]}
      />
      {children}
    </View>
  );
}
