import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  packaged: true, enabled: false, status: 'not-registered',
  setLogin: vi.fn(), settings: { launchAtLogin: true }, save: vi.fn()
}))
vi.mock('../electron/main/platform', () => ({ hostPlatform: 'darwin' }))
vi.mock('electron', () => ({ app: {
  get isPackaged() { return mocks.packaged },
  getLoginItemSettings: () => ({ openAtLogin: mocks.enabled, status: mocks.status }),
  setLoginItemSettings: mocks.setLogin,
  getPath: () => '/Applications/Edge-Drop.app/Contents/MacOS/Edge-Drop'
} }))
vi.mock('../electron/main/config', () => ({ isStoreBuild: () => false }))
vi.mock('../electron/store/settings', () => ({ loadSettings: () => mocks.settings, saveSettings: mocks.save }))
vi.mock('../electron/main/storeStartup', () => ({ getStatus: vi.fn(), enable: vi.fn(), disable: vi.fn(), StartupTaskState: {} }))
import { applyLaunchAtLogin, readLaunchAtLogin, reconcileLaunchAtLoginOnStartup } from '../electron/main/loginItems'
beforeEach(() => {
  mocks.packaged = true; mocks.enabled = false; mocks.status = 'not-registered'
  mocks.setLogin.mockReset(); mocks.save.mockReset()
  mocks.save.mockImplementation((patch) => ({ ...mocks.settings, ...patch }))
})
describe('macOS login items', () => {
  it('uses Mac openAtLogin and verifies readback without Windows path/name/args', async () => {
    mocks.setLogin.mockImplementation(({ openAtLogin }) => { mocks.enabled = openAtLogin })
    expect(await applyLaunchAtLogin(true)).toEqual({ enabled: true, blockedByUser: false, ok: true })
    expect(mocks.setLogin).toHaveBeenCalledWith({ openAtLogin: true })
    expect(await applyLaunchAtLogin(false)).toEqual({ enabled: false, blockedByUser: false, ok: true })
  })
  it('reports System Settings approval without claiming success', async () => {
    mocks.status = 'requires-approval'
    expect(await applyLaunchAtLogin(true)).toEqual({ enabled: false, blockedByUser: true, ok: false })
  })
  it('respects an OS-disabled login item on restart', async () => {
    expect(await readLaunchAtLogin()).toEqual({ enabled: false, blockedByUser: false, ok: true })
    expect(await reconcileLaunchAtLoginOnStartup()).toEqual({ launchAtLogin: false })
    expect(mocks.setLogin).not.toHaveBeenCalled()
  })
  it('never registers the development Electron executable as a login item', async () => {
    mocks.packaged = false
    expect((await applyLaunchAtLogin(true)).ok).toBe(true)
    expect(mocks.setLogin).not.toHaveBeenCalled()
  })
})
