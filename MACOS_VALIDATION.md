# macOS 0.4.0 validation

Validated on 2026-10-08, macOS 15.7.7, Apple Silicon. Local build tools: Xcode Command Line Tools and Node.js 26.8.1. CI uses Node.js 24 and matching arm64/Intel macOS runners.

## Completed checks

- `npm run typecheck`: passed for main/preload and renderer.
- `npm test -- --maxWorkers=4`: 46 files, 451 tests passed, including existing Windows regression fixtures and new macOS clipboard/login tests.
- Apple Silicon packaged-app smoke: renderer/preload and AppKit bridge load; text capture and copy roundtrip; complete two-file URL capture/copy with spaces, Unicode, `%` and `#`; full 1024×1024 image capture/copy; concealed pasteboard exclusion; permission/manual-update settings; denied-permission manual-paste fallback; encrypted index and restart persistence. No renderer exceptions. Test data is isolated and the prior pasteboard restored.
- Separate arm64 and x64 DMG/ZIP builds completed. Packaging hooks verified target architecture for Electron's native dependencies (Koffi and Resvg) and the universal AppKit bridge. Both DMGs mounted read-only, exposed version 0.4.0, and were detached after inspection.
- Installed `/Applications/Edge-Drop.app`; native macOS UI exposes shelf, onboarding and settings. The Accessibility settings link opens the correct System Settings pane. With explicit user authorization, the Edge-Drop Accessibility toggle was enabled and read back as on.

## Evidence boundaries

- Desktop automation could read/type through Accessibility, but physical clicks returned `noWindowsAvailable`; the TextEdit test remained in the background. Automatic paste into another app and search-to-recipient focus restoration therefore **have not been independently accepted**. The user subsequently reported the app should be fine and requested the installer.
- Physical edge-hover, drag-out into Finder/another app, multiple displays, fullscreen Spaces and a real logout/login cycle remain interactive acceptance items. Renderer screenshots deliberately disable hover only in the isolated test profile; they do not prove physical hover.
- The Intel package has passed build and binary-architecture checks. An attempted Rosetta smoke run timed out while attaching Playwright to Electron, so no successful Intel runtime acceptance is claimed. Test on Intel hardware before advertising it as verified there.
- Windows regression tests pass on this Mac with platform seams; no Windows packaged-app run was performed.
- These artifacts are not Developer ID signed or notarized. `codesign -dv` on the installed executable reports an ad-hoc signature without a TeamIdentifier or sealed resources. Gatekeeper-trusted public distribution and signed automatic updates remain dependent on external Apple credentials. Automatic updates are disabled in this build.
- The GitHub workflow uploads build artifacts; it does not publish a Release. Its results must be inspected separately from these local results.

## Artifact checksums (SHA-256)

| Artifact | SHA-256 |
| --- | --- |
| Edge-Drop-0.4.0-mac-arm64.dmg | `d77c9ace068ad06a74da1f44d0a2db15e606693992a3837bb301a9802c4d9fdf` |
| Edge-Drop-0.4.0-mac-arm64.zip | `9a709c1d628cc5a67bbeea74b6144c0c51ac432437c2a3271421ca357d3fad8b` |
| Edge-Drop-0.4.0-mac-x64.dmg | `9115e43ac2a36ae8761f14ceebb1c814c71672783a7ed342f54ab28bee16eb51` |
| Edge-Drop-0.4.0-mac-x64.zip | `afc0ada19d7f8390ae5eba66078283225ec0024be83bd5412b6d02a10acf3619` |

Local JSON results and UI screenshots are generated under `dist/mac-smoke/`; installers and `SHA256SUMS.txt` are in `dist/`. Generated binaries and acceptance artifacts are excluded from Git.
