import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  seq: 100,
  paths: ['/tmp/first file.txt', '/tmp/中文.txt'],
  private: false,
  readImage: vi.fn(),
  native: {
    changeCount: vi.fn(), files: vi.fn(), hasFiles: vi.fn(), isPrivate: vi.fn()
  }
}))
vi.mock('../electron/main/platform', () => ({ hostPlatform: 'darwin' }))
vi.mock('../electron/main/macos', () => ({ getMacNative: () => mocks.native }))
vi.mock('../electron/main/pathValidation', () => ({ filterValidPaths: (p: string[]) => p }))
vi.mock('electron', () => ({
  app: { isPackaged: false },
  clipboard: {
    availableFormats: () => [], readText: () => '', readHTML: () => '',
    readImage: mocks.readImage, readBuffer: () => Buffer.alloc(0)
  }
}))

import { clipboardSignature, getClipboardSequenceNumber, isClipboardExcluded, readClipboard } from '../electron/clipboard/formats'
import { ClipboardWatcher } from '../electron/clipboard/ClipboardWatcher'

beforeEach(() => {
  mocks.seq = 100
  mocks.private = false
  mocks.native.changeCount.mockImplementation(() => mocks.seq)
  mocks.native.files.mockImplementation(() => mocks.paths)
  mocks.native.hasFiles.mockReturnValue(true)
  mocks.native.isPrivate.mockImplementation(() => mocks.private)
  mocks.readImage.mockReset()
})
afterEach(() => vi.useRealTimers())

describe('macOS Finder clipboard', () => {
  it('captures every Finder file and gives files precedence over preview bitmaps', async () => {
    expect(getClipboardSequenceNumber()).toBe(100)
    expect(await readClipboard()).toEqual({ kind: 'files', paths: mocks.paths })
    expect(clipboardSignature()).toBe('seq:100:files:/tmp/first file.txt\n/tmp/中文.txt')
    expect(mocks.readImage).not.toHaveBeenCalled()
  })
  it('excludes concealed and transient pasteboards before reading file/image payloads', async () => {
    mocks.private = true
    expect(isClipboardExcluded()).toBe(true)
    expect(await readClipboard()).toBeNull()
    expect(clipboardSignature()).toBe('seq:100:excluded')
  })
  it('counts a real Finder re-copy of the same files after the coalescing interval', async () => {
    vi.useFakeTimers()
    const watcher = new ClipboardWatcher(50, 100)
    const onNew = vi.fn()
    watcher.start(onNew)
    try {
      mocks.seq++
      await vi.advanceTimersByTimeAsync(200)
      expect(onNew).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(600)
      mocks.seq++
      await vi.advanceTimersByTimeAsync(200)
      expect(onNew).toHaveBeenCalledTimes(2)
      watcher.setPaused(true)
      mocks.seq++
      await vi.advanceTimersByTimeAsync(200)
      expect(onNew).toHaveBeenCalledTimes(2)
      watcher.setPaused(false)
      await vi.advanceTimersByTimeAsync(200)
      expect(onNew).toHaveBeenCalledTimes(2)
    } finally { watcher.stop() }
  })
})
