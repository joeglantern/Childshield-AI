// Haptics choreography:
//  Light  — taps / selection
//  Medium — step completion + selection cards snapping
//  Success notification — report submitted (fired when the mascot pop lands)
//  Warning — override confirm
import * as Haptics from 'expo-haptics';

export const tap = () => {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

export const snap = () => {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};

export const submitted = () => {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

export const warn = () => {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
};
