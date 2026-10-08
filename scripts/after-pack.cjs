const { existsSync } = require('node:fs')
const { join } = require('node:path')
const { execFileSync } = require('node:child_process')

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return
  const arch = context.arch === 3 ? 'arm64' : 'x64'
  const bundle = join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
  const resources = join(bundle, 'Contents/Resources')
  const native = join(resources, 'app.asar.unpacked/node_modules')
  const binaries = [
    join(resources, 'macos/libedgedrop.dylib'),
    join(native, `@koromix/koffi-darwin-${arch}/darwin_${arch}/koffi.node`),
    join(native, `@resvg/resvg-js-darwin-${arch}/resvgjs.darwin-${arch}.node`)
  ]
  for (const binary of binaries) {
    if (!existsSync(binary)) throw new Error(`Missing ${arch} native component: ${binary}`)
    execFileSync('lipo', [binary, '-verify_arch', arch === 'x64' ? 'x86_64' : arch], { stdio: 'inherit' })
  }
  console.log(`Verified all packaged macOS native components for ${arch}`)
}
