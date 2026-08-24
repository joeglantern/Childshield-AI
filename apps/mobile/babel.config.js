// SDK 57: babel-preset-expo configures the worklets plugin (Reanimated 4)
// automatically — do not add react-native-reanimated/plugin manually.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
