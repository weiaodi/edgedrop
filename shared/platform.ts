export interface PlatformInfo {
  platform: 'darwin' | 'win32' | 'linux' | 'other'
  nativeAvailable: boolean
  accessibilityTrusted: boolean
  automaticUpdatesAvailable: boolean
}
