const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')
const path = require('path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Watch monorepo root + root node_modules so asset-heavy packages
// installed at the root (e.g. react-native-calendars) can serve their images
config.watchFolders = [
  monorepoRoot,
  path.resolve(monorepoRoot, 'node_modules'),
]

// Resolve from mobile node_modules first, then monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]

// Force these packages to always resolve from the mobile app
// to avoid duplicate React/React Native instances
config.resolver.extraNodeModules = {
  'react': path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
}

module.exports = withNativeWind(config, { input: './global.css' })
