import { app } from 'electron'
import { join } from 'node:path'
import koffi from 'koffi'

export interface MacNative {
  changeCount(): number
  files(): string[]
  hasFiles(): boolean
  isPrivate(): boolean
  writeFiles(paths: string[]): boolean
  writeImage(imagePath: string, filePath: string): boolean
  frontmostPid(): number
  activate(pid: number): boolean
  trusted(): boolean
  paste(pid: number): boolean
  fullscreen(): boolean
}

let cached: MacNative | null | undefined

/** Loaded only in the main process; failures remain visible in permission UI. */
export function getMacNative(): MacNative | null {
  if (process.platform !== 'darwin') return null
  if (cached !== undefined) return cached
  try {
    const path = app.isPackaged
      ? join(process.resourcesPath, 'macos/libedgedrop.dylib')
      : join(app.getAppPath(), 'resources/macos/libedgedrop.dylib')
    const lib = koffi.load(path)
    const files = lib.func('void *ed_clipboard_files(void)')
    const free = lib.func('void ed_free(void *pointer)')
    const writeFiles = lib.func('int ed_clipboard_write_files(const char *json)')
    const writeImage = lib.func('int ed_clipboard_write_image(const char *imagePath, const char *filePath)')
    const hasFiles = lib.func('int ed_clipboard_has_files(void)')
    const isPrivate = lib.func('int ed_clipboard_is_private(void)')
    const activate = lib.func('int ed_activate_pid(int pid)')
    const trusted = lib.func('int ed_accessibility_trusted(void)')
    const paste = lib.func('int ed_paste(int expectedPid)')
    const fullscreen = lib.func('int ed_frontmost_fullscreen(void)')
    cached = {
      changeCount: lib.func('int64_t ed_clipboard_change_count(void)'),
      files: () => {
        const ptr = files()
        if (!ptr) return []
        try {
          const result: unknown = JSON.parse(koffi.decode(ptr, 'char', -1))
          return Array.isArray(result) ? result.filter((p): p is string => typeof p === 'string' && p.startsWith('/')) : []
        } finally { free(ptr) }
      },
      hasFiles: () => !!hasFiles(),
      isPrivate: () => !!isPrivate(),
      writeFiles: (paths) => !!writeFiles(JSON.stringify(paths)),
      writeImage: (imagePath, filePath) => !!writeImage(imagePath, filePath),
      frontmostPid: lib.func('int ed_frontmost_pid(void)'),
      activate: (pid) => !!activate(pid),
      trusted: () => !!trusted(),
      paste: (pid) => !!paste(pid),
      fullscreen: () => !!fullscreen()
    }
  } catch (error) {
    console.error('[macOS] Native bridge unavailable:', error)
    cached = null
  }
  return cached
}
