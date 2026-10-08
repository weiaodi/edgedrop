import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

if (process.platform !== 'darwin') process.exit(0)
const root = fileURLToPath(new URL('../', import.meta.url))
const output = join(root, 'resources', 'macos')
mkdirSync(output, { recursive: true })
const sdk = execFileSync('xcrun', ['--show-sdk-path'], { encoding: 'utf8' }).trim()
// One universal, SDK-only dylib works in both separately packaged Electron apps.
execFileSync('xcrun', ['clang', '-dynamiclib', '-fobjc-arc', '-O2', '-Wall', '-Wextra',
  '-arch', 'arm64', '-arch', 'x86_64', '-isysroot', sdk, '-mmacosx-version-min=12.0',
  '-framework', 'AppKit', '-framework', 'ApplicationServices',
  '-install_name', '@rpath/libedgedrop.dylib', join(root, 'native/macos/EdgeDropNative.m'),
  '-o', join(output, 'libedgedrop.dylib')], { stdio: 'inherit' })
console.log('Built macOS native bridge (arm64 + x86_64)')
