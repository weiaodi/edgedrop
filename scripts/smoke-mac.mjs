import { _electron } from 'playwright'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, realpathSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import assert from 'node:assert/strict'

if (process.platform !== 'darwin') throw new Error('Run packaged macOS acceptance on a Mac')
const bundle = resolve(process.argv[2] || 'dist/mac-arm64/Edge-Drop.app')
const output = resolve(process.argv[3] || 'dist/mac-smoke')
mkdirSync(output, { recursive: true })
const scratch = mkdtempSync(join(tmpdir(), 'edgedrop-acceptance-'))
const userData = join(scratch, 'profile')
mkdirSync(userData)
writeFileSync(join(userData, 'settings.json'), JSON.stringify({ tutorialCompleted: true, language: 'en', launchAtLogin: false }))
const fixture = join(scratch, 'clipboard-fixture')
execFileSync('xcrun', ['clang', '-fobjc-arc', '-framework', 'AppKit', 'tests/fixtures/macosClipboard.m', '-o', fixture])
const clipboardSnapshot = join(scratch, 'clipboard.plist')
execFileSync(fixture, ['snapshot', clipboardSnapshot])
const results = []
const errors = []
let app
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function waitFor(fn, label) {
  for (let n = 0; n < 50; n++) {
    if (await fn()) { results.push(label); return }
    await sleep(100)
  }
  throw new Error(`Timed out: ${label}`)
}
async function launch() {
  const instance = await _electron.launch({ executablePath: join(bundle, 'Contents/MacOS/Edge-Drop'),
    args: [`--user-data-dir=${userData}`, '--hidden'], timeout: 30000 })
  app = instance
  const profile = await instance.evaluate(({ app }) => app.getPath('userData'))
  assert.equal(realpathSync(profile), realpathSync(userData), 'Tests must use isolated application data')
  const page = await instance.firstWindow()
  page.on('pageerror', (error) => errors.push(error.message))
  await page.waitForFunction(() => !!window.edge)
  return { instance, page }
}
async function openShelf(page) {
  // Deterministic renderer screenshots; this does not test physical edge hover.
  await page.evaluate(() => window.edge.updateSettings({ hoverActivation: false }))
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.send('window:toggle', true))
  await sleep(350)
}
try {
  let session = await launch(); app = session.instance
  let page = session.page
  const info = await page.evaluate(() => window.edge.getPlatformInfo())
  assert.equal(info.nativeAvailable, true)
  assert.equal(info.platform, 'darwin')
  assert.equal(info.automaticUpdatesAvailable, false)
  results.push('Packaged renderer/preload/native bridge loaded; manual-update policy active')
  await waitFor(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible()), 'Shelf is visible after ready-to-show')
  assert.equal(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isFocusable()), false)
  const token = `EdgeDrop Mac acceptance ${Date.now()}`
  await app.evaluate(({ clipboard }, text) => clipboard.writeText(text), token)
  const state = () => page.evaluate(() => window.edge.loadState())
  await waitFor(async () => (await state()).items.some((i) => i.data.kind === 'text' && i.data.text === token), 'Real system text clipboard captured')
  const textItem = (await state()).items.find((i) => i.data.kind === 'text' && i.data.text === token)
  await app.evaluate(({ clipboard }) => clipboard.writeText('Other acceptance content'))
  await sleep(650)
  assert.equal(await page.evaluate((id) => window.edge.copyItem(id), textItem.id), true)
  assert.equal(await app.evaluate(({ clipboard }) => clipboard.readText()), token)
  results.push('Text copy roundtrip restores full content')
  await sleep(650)

  const paths = [join(scratch, 'first file.txt'), join(scratch, '中文 % #.txt')]
  paths.forEach((path) => writeFileSync(path, 'acceptance fixture'))
  execFileSync(fixture, ['files', ...paths])
  await waitFor(async () => (await state()).items.some((i) => i.data.kind === 'files' && i.data.paths.length === 2), 'AppKit multi-file Finder-style clipboard captured')
  const fileItem = (await state()).items.find((i) => i.data.kind === 'files' && i.data.paths.length === 2)
  assert.deepEqual(fileItem.data.paths, paths)
  await app.evaluate(({ clipboard }) => clipboard.writeText('File copy roundtrip'))
  assert.equal(await page.evaluate((id) => window.edge.copyItem(id), fileItem.id), true)
  assert.deepEqual(JSON.parse(execFileSync(fixture, ['read-files', 'unused'], { encoding: 'utf8' })), paths)
  results.push('File copy writes actual file URLs, including spaces, Unicode, percent and hash')
  await sleep(650)

  await sleep(700)
  execFileSync(fixture, ['image', resolve('resources/icon-mac.png')])
  await waitFor(async () => (await state()).items.some((i) => i.data.kind === 'image'), 'Real image pasteboard captured and persisted')
  const imageItem = (await state()).items.find((i) => i.data.kind === 'image')
  await sleep(650)
  assert.equal(await page.evaluate((id) => window.edge.copyItem(id), imageItem.id), true)
  const imageSize = await app.evaluate(({ clipboard }) => clipboard.readImage().getSize())
  assert.deepEqual(imageSize, { width: 1024, height: 1024 })
  results.push('Image copy retains full 1024 x 1024 resolution')

  await sleep(700)
  const concealed = `Concealed acceptance ${Date.now()}`
  execFileSync(fixture, ['private', concealed])
  await sleep(1100)
  assert.equal((await state()).items.some((i) => i.data.text === concealed), false)
  results.push('Concealed pasteboard content excluded from history')

  await openShelf(page)
  await page.screenshot({ path: join(output, 'shelf.png') })
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.send('window:open-settings'))
  await sleep(350)
  await page.getByText('macOS Accessibility', { exact: true }).waitFor()
  await page.screenshot({ path: join(output, 'settings.png') })
  results.push('Settings render macOS permission status and manual-update guidance')

  if (!info.accessibilityTrusted) {
    await page.evaluate((id) => window.edge.pasteItem(id), textItem.id)
    await sleep(450)
    assert.equal(await app.evaluate(({ clipboard }) => clipboard.readText()), token)
    results.push('Denied Accessibility leaves the selected text ready for manual Command-V')
  }

  const priorIds = (await state()).items.map((i) => i.id)
  await app.close(); app = null
  session = await launch(); app = session.instance; page = session.page
  await waitFor(async () => (await page.evaluate(() => window.edge.loadState())).items.some((i) => i.id === textItem.id), 'History survives packaged app restart')
  const afterIds = (await page.evaluate(() => window.edge.loadState())).items.map((i) => i.id)
  assert.deepEqual(new Set(afterIds), new Set(priorIds))
  const index = JSON.parse(readFileSync(join(userData, 'items.json'), 'utf8'))
  assert.ok(index.encrypted, 'History index uses safeStorage/Keychain encryption')
  results.push('History index encrypted at rest')
  assert.deepEqual(errors, [], 'No renderer exceptions')
  console.log(JSON.stringify({ bundle, info, results }, null, 2))
  writeFileSync(join(output, 'results.json'), JSON.stringify({ bundle, info, results }, null, 2))
} finally {
  if (app) await app.close()
  execFileSync(fixture, ['restore', clipboardSnapshot])
  rmSync(scratch, { recursive: true, force: true })
}
