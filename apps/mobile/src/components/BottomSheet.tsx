// Gesture-driven bottom sheet: tracks the finger, drags to dismiss with
// rubber-banding when pulled past its resting point. Springs only.
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { spring } from '../theme/motion';
import { palette } from '../theme/tokens';

interface Props {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  background?: string;
  /// Spoken name for the tap-outside-to-dismiss backdrop. Pan-to-dismiss is
  /// unavailable to switch and screen-reader users, so this is their only
  /// way out of the sheet and it must be named.
  closeLabel?: string;
}

export function BottomSheet({
  open,
  onClose,
  children,
  background = palette.white,
  closeLabel = 'Close',
}: Props) {
  const { height } = useWindowDimensions();
  const ty = useSharedValue(height);

  useEffect(() => {
    ty.value = withSpring(open ? 0 : height, spring);
  }, [open, height, ty]);

  const pan = Gesture.Pan()
    .onChange((e) => {
      const next = ty.value + e.changeY;
      // Rubber-band when dragged above the resting point.
      ty.value = next < 0 ? next / 3 : next;
    })
    .onEnd((e) => {
      if (ty.value > 120 || e.velocityY > 900) {
        ty.value = withSpring(height, spring, (finished) => {
          if (finished) runOnJS(onClose)();
        });
      } else {
        ty.value = withSpring(0, spring);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }] }));
  const dimStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(Math.max(ty.value, 0), height) / height,
  }));

  if (!open) return null;

  return (
    // ACCESSIBILITY: without accessibilityViewIsModal a screen reader walks
    // straight past the sheet into the screen behind it.
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" accessibilityViewIsModal>
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(5,66,64,0.32)' }, dimStyle]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
        />
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: background,
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              paddingTop: 10,
              paddingHorizontal: 20,
              paddingBottom: 30,
            },
            sheetStyle,
          ]}
        >
          <View
            style={{
              width: 40,
              height: 5,
              borderRadius: 3,
              backgroundColor: palette.track,
              alignSelf: 'center',
              marginBottom: 16,
            }}
          />
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
