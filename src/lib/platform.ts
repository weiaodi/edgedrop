/** Platform is exposed by the sandboxed preload, without Node in the renderer. */
export const isMac = (globalThis as { window?: { edge?: { platform?: string } } }).window?.edge?.platform === 'darwin'

export function platformShortcut(text: string): string {
  if (!isMac) return text
  return text.replace(/Ctrl\s*\+\s*/g, '⌘+').replace(/Alt\s*\+\s*/g, '⌥+')
}
