// Motion rules — no exceptions. Everything is withSpring.
import { withSpring, type WithSpringConfig } from 'react-native-reanimated';

/// Default spring for all movement.
export const spring: WithSpringConfig = { damping: 15, stiffness: 170 };

/// Playful elements get slight overshoot.
export const springPlayful: WithSpringConfig = { damping: 12, stiffness: 200 };

export const toSpring = (value: number) => withSpring(value, spring);
export const toSpringPlayful = (value: number) => withSpring(value, springPlayful);

/// Queue cards stagger in with this per-item delay (ms).
export const STAGGER_MS = 40;
