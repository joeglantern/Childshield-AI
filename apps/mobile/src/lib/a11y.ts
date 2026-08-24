// Screen-reader announcements.
//
// Anything that changes without the user acting — a submission finishing, a
// lookup failing, a connection dropping — is invisible to a screen-reader
// user unless we say so. Sighted users get the new text appearing; everyone
// else gets silence, and on this app that silence lands on "did my report
// send?", which is the worst possible moment to leave a child guessing.
//
// Two mechanisms, and they are not interchangeable:
//   announce()          — imperative, for one-off events (submitted, failed).
//   liveRegion()        — props for text that updates in place (status, errors).
import { AccessibilityInfo, Platform } from 'react-native';

/// Speak a message immediately. No-op when no screen reader is running.
export function announce(message: string): void {
  if (!message) return;
  AccessibilityInfo.announceForAccessibility(message);
}

/// Speak only if a screen reader is actually active. Use when the message
/// would otherwise duplicate a visible change the user can already see.
export async function announceIfScreenReader(message: string): Promise<void> {
  if (!message) return;
  try {
    if (await AccessibilityInfo.isScreenReaderEnabled()) {
      AccessibilityInfo.announceForAccessibility(message);
    }
  } catch {
    // Never let an accessibility nicety break the calling flow.
  }
}

/// Props for a element whose text changes in place and should be read when
/// it does. `assertive` interrupts the user; reserve it for errors.
export function liveRegion(assertive = false) {
  return {
    // Android reads the region on change; iOS needs the explicit announce
    // above, which is why the error paths call both.
    accessibilityLiveRegion: (assertive ? 'assertive' : 'polite') as 'assertive' | 'polite',
    ...(Platform.OS === 'ios' ? { accessibilityRole: 'text' as const } : {}),
  };
}

/// Props marking a container as a modal, so screen readers stop at its edge
/// instead of wandering into the screen behind it.
export function modalContainer() {
  return {
    accessibilityViewIsModal: true,
    accessibilityElementsHidden: false,
    importantForAccessibility: 'yes' as const,
  };
}
