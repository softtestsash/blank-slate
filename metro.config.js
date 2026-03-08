const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// date-fns v3 and other modern ESM packages use import.meta — enabling
// package exports resolution lets Metro pick their CJS builds on web.
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
