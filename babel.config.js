module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // react-native-worklets/plugin must be listed LAST (Reanimated 4 moved
      // the worklet transform from react-native-reanimated/plugin to here).
      'react-native-worklets/plugin',
    ],
  };
};
