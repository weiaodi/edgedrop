# Edge-Drop for macOS

This fork ports [Deepender25/Edge-Drop](https://github.com/Deepender25/Edge-Drop) to macOS. Source and future releases live at [weiaodi/edgedrop](https://github.com/weiaodi/edgedrop). The original Apache-2.0 license and attribution are retained.

## Install and use

- macOS 12 or later. Choose `mac-arm64.dmg` for Apple Silicon (M-series), or `mac-x64.dmg` for Intel.
- Open the DMG and drag **Edge-Drop** into **Applications**. Launch the application from there, rather than leaving it on the mounted disk image.
- Edge-Drop runs in the menu bar without a Dock icon. Approach the configured screen edge to open the shelf, or press **Option+C**. The menu-bar menu provides Show/Hide, Settings and Quit.
- Copy text, links, images or Finder files normally with **Command+C**. Use the card's copy button to put an item back on the clipboard, or drag a card into another app/Finder.
- For click-to-paste, open **Settings → Behaviour → macOS Accessibility → Open System Settings**. In **Privacy & Security → Accessibility**, add/enable the installed **Edge-Drop.app**. Capture, copy and drag work without this permission; use **Command+V** manually. Fullscreen suppression also requires Accessibility. Screen Recording is not required.
- Enable **Launch at login** in Edge-Drop if desired. macOS may require approval in **General → Login Items**. The UI reflects the OS setting, including changes made outside Edge-Drop.
- History is local to `~/Library/Application Support/Edge-Drop` (source builds may use `edge-drop`). The history index is encrypted using Electron safeStorage and macOS Keychain; the image/text payload files are local files and are not encrypted by that index encryption.

Local/CI packages are unsigned distribution builds with ad-hoc signatures on some native components, **not Developer ID signed or notarized**. macOS may require explicit approval in **Privacy & Security** after first launch. Do not disable Gatekeeper globally. An officially trusted download requires the signing process below.

## Build

Install Node.js **22.12+** (Node 24 recommended) and Xcode Command Line Tools. No Swift package manager or third-party native SDK is needed.

```sh
npm ci
node node_modules/electron/install.js
npm run dev
npm run typecheck
npm test
npm run build:mac:arm64
npm run build:mac:x64
# Or build both architecture-specific packages:
npm run build:mac:all
```

`build` and `dev` compile the AppKit bridge automatically. `resources/macos/libedgedrop.dylib` is a generated universal binary and is intentionally ignored by Git. Both DMG and ZIP are written to `dist/` with an architecture in their filename. Windows StartupTask executables are included only in Windows packages.

The `macOS packages` GitHub Actions workflow builds each architecture on a matching Mac runner and uploads DMG/ZIP artifacts. It does not publish a public release or grant macOS permissions.

## Verify a packaged app

```sh
node scripts/smoke-mac.mjs dist/mac-arm64/Edge-Drop.app
# Intel on Intel hardware, or under an already-installed Rosetta:
node scripts/smoke-mac.mjs dist/mac/Edge-Drop.app dist/mac-smoke-x64
```

The acceptance harness launches the real packaged app using a temporary user-data directory. It backs up all pasteboard items/types, exercises text/files/images and sensitive-format filtering, checks copy roundtrips, renders the settings UI, verifies encrypted history and restart persistence, then restores the clipboard and removes its temporary data. JSON results/screenshots go into `dist/mac-smoke`. It never grants Accessibility or registers login items.

Native drag acceptance, OS focus, full-screen Spaces and login behavior should also be exercised interactively. Automated clipboard fixtures are not evidence of physical drag-and-drop or an actual login cycle. See [MACOS_VALIDATION.md](MACOS_VALIDATION.md) for the current evidence.

## Developer ID distribution

Use your own **Developer ID Application** certificate and Apple notarization credentials outside Git. electron-builder 26 supports `CSC_LINK` / `CSC_KEY_PASSWORD` and either `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`, or the supported App Store Connect API-key environment variables. The Mac configuration enables hardened runtime and includes the Electron/native-library entitlements.

For a trusted release, build with the certificate available, notarize/staple, and verify the result with `codesign --verify --deep --strict` and `spctl --assess --type execute`. Do not call a build signed/notarized based solely on a successful packaging exit code.

Mac automatic updates are disabled by default because Squirrel.Mac requires signed distribution. After setting up a consistently signed/notarized release pipeline, opt in with `-c.extraMetadata.macAutoUpdates=true`; publish both DMG/ZIP and the architecture-appropriate updater metadata to **weiaodi/edgedrop**. Until then, Settings provides a manual Releases download link. No Mac build points to the upstream Windows release feed.

## Platform implementation

- `native/macos/EdgeDropNative.m`: eager file URL/image pasteboard writes, complete file URL reads, pasteboard change count and concealed/transient type checks, foreground app PID/activation, recipient-checked Command-V, Accessibility-backed fullscreen query.
- `electron/main/macos.ts`: lazy main-process C ABI loading through the existing Koffi dependency, with explicit unavailable status.
- `electron/main/window.ts`: nonactivating panel, click-through collapse, all Spaces/fullscreen visibility and verified focus handoff.
- `electron/main/loginItems.ts`: Mac login-item readback; development builds never register the Electron runtime as a startup item.
- `src/components/MacPermissions.tsx`: live permission state and a user-triggered System Settings link.

Reference: [Electron BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window/), [Apple NSPasteboard](https://developer.apple.com/documentation/appkit/nspasteboard), [electron-builder 26 Mac configuration](https://www.electron.build/v26/docs/mac/).
