const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname)

// Cache transforms per project; the machine-wide Metro cache can serve stale transforms from other projects.
config.cacheStores = ({ FileStore }) => [
  new FileStore({ root: path.join(__dirname, 'node_modules', '.cache', 'metro') }),
]

// Silence Metro package-exports fallback warnings from @solana/web3.js dependencies:
// - rpc-websockets@9.3.9 defines top-level "browser"/"node" keys in "exports" without "."
// - @noble/hashes@1.8.0 exports "./crypto" without the ".js" suffix
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@noble/hashes/crypto.js' || moduleName.endsWith('/@noble/hashes/crypto.js')) {
    return context.resolveRequest(context, '@noble/hashes/crypto', platform)
  }
  if (moduleName === 'rpc-websockets') {
    return context.resolveRequest(
      { ...context, unstable_enablePackageExports: false },
      moduleName,
      platform
    )
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
