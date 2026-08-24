// Monorepo-aware Metro config: watch the workspace root so @childshield/shared
// (TS source) resolves and hot-reloads.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// .ogg isn't in Metro's default assetExts (only aac/m4a/mp3/wav) — needed for
// the games feature's Kenney CC0 sound effects.
config.resolver.assetExts = [...config.resolver.assetExts, 'ogg'];

// Singleton packages: the workspace also contains React 18 (dashboard), and
// mixing copies crashes with "A React Element from an older version of React
// was rendered". Force every react/react-native-family import to resolve
// from THIS app's node_modules, regardless of where the import originates.
const SINGLETONS = [
  'react',
  'react-dom',
  'react-native',
  'react-native-reanimated',
  'react-native-gesture-handler',
  'react-native-safe-area-context',
  'react-native-screens',
  'expo',
  'expo-router',
];
const appOrigin = path.join(projectRoot, 'package.json');

// Subpath exports of the workspace shared package — Metro does not reliably
// honor `exports` maps of symlinked workspace packages, so resolve them as
// relative imports from inside the package (the same mechanism its own
// internal imports use, which Metro already handles).
const sharedIndex = path.resolve(workspaceRoot, 'packages/shared/src/index.ts');
const SHARED_SUBPATHS = {
  '@childshield/shared/constants': './constants',
  '@childshield/shared/transitions': './transitions',
};

// @childshield/shared uses NodeNext ESM specifiers ("./enums.js" pointing at
// enums.ts). Metro doesn't map .js -> .ts, so retry without the extension.
// async-storage's web build imports `merge-options`, whose exports map points
// Metro at an .mjs wrapper that comes back with an undefined default on web
// ("Cannot read properties of undefined (reading 'bind')"). Pin it to the CJS
// entry, which interops correctly.
const mergeOptionsCjs = require.resolve('merge-options', {
  paths: [
    path.dirname(
      require.resolve('@react-native-async-storage/async-storage/package.json', {
        paths: [projectRoot],
      }),
    ),
  ],
});

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = defaultResolveRequest ?? context.resolveRequest;
  if (moduleName === 'merge-options') {
    return { type: 'sourceFile', filePath: mergeOptionsCjs };
  }
  // canvaskit-wasm (Skia's WASM build) is web-only, but expo-router's
  // require.context sweeps the *.web.tsx game routes into every platform's
  // bundle graph, and canvaskit's entry requires `fs`. Stub it out of
  // native bundles; the runtime never reaches it there.
  if (
    platform !== 'web' &&
    (moduleName === 'canvaskit-wasm' || moduleName.startsWith('canvaskit-wasm/'))
  ) {
    return { type: 'empty' };
  }
  if (SHARED_SUBPATHS[moduleName]) {
    return resolve(
      { ...context, originModulePath: sharedIndex },
      SHARED_SUBPATHS[moduleName],
      platform,
    );
  }
  const pinned = SINGLETONS.find(
    (name) => moduleName === name || moduleName.startsWith(`${name}/`),
  );
  if (pinned) {
    return resolve({ ...context, originModulePath: appOrigin }, moduleName, platform);
  }
  if (moduleName.startsWith('.') && moduleName.endsWith('.js')) {
    try {
      return resolve(context, moduleName.replace(/\.js$/, ''), platform);
    } catch {
      // fall through to the literal specifier
    }
  }
  return resolve(context, moduleName, platform);
};

module.exports = config;
