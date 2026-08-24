// Stage dimensions: the size of the area the app actually renders in.
//
// On native this is simply the window. On web the app renders inside a
// centered phone-width column (see WebShell), so any screen doing
// absolute-position math (the games' canvases, overlays, grids) must use
// the stage size, not the browser window size, or everything stretches
// across the whole monitor.
import { Platform, useWindowDimensions } from 'react-native';

/// Width of the centered app column on desktop-sized web viewports.
/// Wider than a phone so it reads as a desktop app, narrow enough that
/// cards and text lines stay comfortable.
export const WEB_STAGE_MAX_W = 720;

/// Viewport width at which the web shell switches to the framed layout.
export const WEB_FRAME_MIN_W = 880;

/// On web the tab bar renders as a floating pill at the TOP of the stage
/// (native puts it at the bottom), so tab screens need extra headroom.
export const WEB_TAB_INSET = Platform.OS === 'web' ? 56 : 0;

export function useStageDimensions(): { width: number; height: number } {
  const { width, height } = useWindowDimensions();
  if (Platform.OS === 'web' && width >= WEB_FRAME_MIN_W) {
    return { width: WEB_STAGE_MAX_W, height };
  }
  return { width, height };
}
