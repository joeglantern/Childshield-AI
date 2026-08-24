// Mascot idle animations — looping withRepeat springs, never timing curves.
//  welcome: bobs translateY ±7 over ~3.4s
//  celebrate: pops in with overshoot spring (fires a callback when it lands)
//  sad: slow 2° sway
import React, { useEffect } from 'react';
import { AccessibilityInfo, type ImageSourcePropType, type StyleProp, type ImageStyle } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { springPlayful } from '../theme/motion';

// Soft springs tuned so one bob half-cycle lasts ~1.7s (full bob ~3.4s).
const bobSpring = { damping: 14, stiffness: 12 };
const swaySpring = { damping: 16, stiffness: 8 };

function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

interface Props {
  source: ImageSourcePropType;
  size: number;
  variant: 'bob' | 'pop' | 'sway' | 'still';
  style?: StyleProp<ImageStyle>;
  /// pop only: called once the overshoot lands (Success haptic hook point).
  onPopLanded?: () => void;
}

export function Mascot({ source, size, variant, style, onPopLanded }: Props) {
  const reduced = useReducedMotion();
  const ty = useSharedValue(0);
  const rot = useSharedValue(0);
  const scale = useSharedValue(variant === 'pop' ? 0.4 : 1);
  const opacity = useSharedValue(variant === 'pop' ? 0 : 1);

  useEffect(() => {
    if (reduced) {
      ty.value = 0;
      rot.value = 0;
      scale.value = 1;
      opacity.value = 1;
      if (variant === 'pop') onPopLanded?.();
      return;
    }
    if (variant === 'bob') {
      ty.value = withRepeat(withSequence(withSpring(-7, bobSpring), withSpring(0, bobSpring)), -1);
      rot.value = withRepeat(
        withSequence(withSpring(1.5, bobSpring), withSpring(-1, bobSpring)),
        -1,
      );
    } else if (variant === 'sway') {
      rot.value = withRepeat(withSequence(withSpring(2, swaySpring), withSpring(-2, swaySpring)), -1);
    } else if (variant === 'pop') {
      opacity.value = withSpring(1, springPlayful);
      scale.value = withDelay(
        120,
        withSpring(1, springPlayful, (finished) => {
          if (finished && onPopLanded) runOnJS(onPopLanded)();
        }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, reduced]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: ty.value },
      { rotate: `${rot.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.Image
      source={source}
      style={[{ width: size, height: size, resizeMode: 'contain' }, animatedStyle, style]}
      accessibilityRole="image"
      accessible={false}
    />
  );
}
