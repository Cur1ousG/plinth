const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withNativeWind } = require('nativewind/metro');

// getSentryExpoConfig wraps Expo's default Metro config and adds the sourcemap
// plumbing Sentry needs. NativeWind is layered on top of it.
const config = getSentryExpoConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
