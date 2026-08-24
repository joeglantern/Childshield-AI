/**
 * Web-only Skia bootstrap. The Skia games render through CanvasKit (Skia's
 * WASM build) in the browser, and CanvasKit must finish loading before any
 * module that imports @shopify/react-native-skia is evaluated — hence the
 * lazy getComponent() indirection. Only *.web.tsx route files import this.
 *
 * canvaskit.wasm is served from our own origin (apps/mobile/public/), never
 * a CDN: the games' zero-external-network rule is a safeguarding decision
 * and applies on web too.
 */
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

import { palette } from '../theme/tokens';

const opts = { locateFile: (file: string) => `/${file}` };

export function skiaRoute(getComponent: () => Promise<{ default: React.ComponentType }>) {
  return function SkiaRoute() {
    return (
      <WithSkiaWeb
        getComponent={getComponent}
        opts={opts}
        componentProps={undefined}
        fallback={
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: palette.darkSurface,
            }}
          >
            <ActivityIndicator color={palette.amber} />
          </View>
        }
      />
    );
  };
}
