const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')
const path = require('path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Watch monorepo root for shared packages
config.watchFolders = [monorepoRoot]

// Resolve from mobile node_modules first, then monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]

// Force these packages to always resolve from a known location
// react/react-native must come from mobile to avoid duplicates
// expo-file-system/expo-sharing live in monorepo root node_modules
config.resolver.extraNodeModules = {
  'react': path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  'expo-file-system': path.resolve(monorepoRoot, 'node_modules/expo-file-system'),
  'expo-sharing': path.resolve(monorepoRoot, 'node_modules/expo-sharing'),
}

module.exports = withNativeWind(config, { input: './global.css' })
