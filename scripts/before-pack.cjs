// npm normally installs optional native packages for the HOST architecture.
// Cross-packaging must also install the matching TARGET packages.
const { existsSync, readFileSync, mkdtempSync, mkdirSync, rmSync } = require('node:fs')
const { join } = require('node:path')
const { tmpdir } = require('node:os')
const { execFileSync } = require('node:child_process')

module.exports = async function beforePack(context) {
  if (context.electronPlatformName !== 'darwin') return
  const arch = context.arch === 3 ? 'arm64' : context.arch === 1 ? 'x64' : null
  if (!arch) throw new Error('Use separate arm64/x64 Mac targets')
  const root = context.packager.projectDir
  const specs = [
    ['koffi', `@koromix/koffi-darwin-${arch}`],
    ['@resvg/resvg-js', `@resvg/resvg-js-darwin-${arch}`]
  ].filter(([, target]) => !existsSync(join(root, 'node_modules', target, 'package.json')))
    .map(([parent, target]) => {
      const pkg = JSON.parse(readFileSync(join(root, 'node_modules', parent, 'package.json'), 'utf8'))
      return `${target}@${pkg.optionalDependencies[target]}`
    })
  if (specs.length) {
    // Fetch only these already-declared optional packages; do not re-resolve
    // the whole install or prune the host's native modules during a build.
    const temp = mkdtempSync(join(tmpdir(), 'edgedrop-native-deps-'))
    try {
      const packed = JSON.parse(execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', temp, ...specs],
        { cwd: root, encoding: 'utf8' }))
      for (const entry of packed) {
        const target = join(root, 'node_modules', entry.name)
        mkdirSync(target, { recursive: true })
        execFileSync('tar', ['-xzf', join(temp, entry.filename), '--strip-components=1', '-C', target])
      }
    } finally { rmSync(temp, { recursive: true, force: true }) }
  }
}
