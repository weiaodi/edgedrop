# Edge-Drop macOS delivery plan

## Goal and scope

Ship the existing clipboard shelf as a usable macOS menu-bar application, retaining Windows support and upstream attribution. Deliver source to https://github.com/weiaodi/edgedrop and locally installable DMG/ZIP artifacts for Apple Silicon and Intel. Minimum macOS version: 12. macOS App Store distribution and cloud sync are outside this port.

## Implementation

1. **Native platform boundary**: a small Objective-C dylib built with the macOS SDK for arm64 and x86_64. Use NSPasteboard for change counts, complete Finder file lists and atomic file/image writes; honor concealed/transient pasteboard types. Use NSWorkspace for foreground identity and verified focus restoration, and CGEvent for Command-V. Keep existing Windows paths intact.
2. **Desktop behavior**: nonactivating Electron panel, visible in Spaces and full-screen apps, collapsed click-through, menu-bar template icon, standard application/edit menu, explicit focus only for search/settings input. Keep the existing edge geometry and multi-monitor engine.
3. **Product integration**: Accessibility status and a user-triggered settings shortcut, honest manual-paste fallback without permission, native login-item registration and readback, Command/Option labels, Finder paths, encrypted history through Electron safeStorage/Keychain. No Screen Recording permission required.
4. **Packaging**: Mac scripts, reproducible native compilation, architecture-specific DMG/ZIP, correct extraResources and native unpacking, fork-specific update feed, GitHub Actions build matrix, opt-in Developer ID signing/notarization documented. Local unsigned/ad-hoc builds must not silently auto-install releases.
5. **Acceptance and delivery**: typecheck, existing regression tests plus platform-specific tests, real packaged app launch and clipboard/file/image capture, edge opening, settings and permission fallback, drag-out and focus/paste where OS permissions allow, restart persistence, DMG mount and artifact inspection. Record tested and untested boundaries in MACOS_VALIDATION.md, then commit/push and verify the remote SHA.

## Acceptance boundaries

- An installable package alone is not functional acceptance; exercise the packaged app.
- Apple Silicon and Intel builds are separate artifacts. Intel compilation is not proof of Intel hardware behavior.
- Accessibility is optional for capture/copy/drag, required for simulated paste and fullscreen suppression. Refusal must leave content ready for manual Command-V.
- Login-item APIs are tested separately from an actual logout/login cycle.
- Public Gatekeeper-trusted distribution requires a Developer ID certificate and notarization credentials, supplied outside source control. Do not describe an ad-hoc local package as notarized.
- Never replace an existing destination branch by force. Preserve the original repository history and unrelated work.

## Progress

- [x] Initial code/platform audit: Electron/React; Windows-only paste, Finder file handling and packaging are the major blockers. Destination currently has no refs. Working tree initially clean.
- [x] Native boundary and desktop integration
- [x] Product/permission/login integration
- [x] Packaging and CI configuration (remote CI results are separate)
- [x] Apple Silicon automated acceptance and both architecture artifacts; interactive/Intel limits recorded in MACOS_VALIDATION.md
- [x] Port committed as `a5089083a9086c8f2936a65da65fa6ba38758585`, pushed to `weiaodi/edgedrop:main`, and confirmed with `git ls-remote`
