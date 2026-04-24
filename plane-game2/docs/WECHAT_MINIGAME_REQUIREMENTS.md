# WeChat Minigame Requirements

Checked on: 2026-04-24

This document explains how `plane-game2` is aligned with the current WeChat minigame project model.

## Official References

- Minigame start guide:
  https://developers.weixin.qq.com/minigame/dev/guide/develop/start.html
- Minigame `game.json` configuration:
  https://developers.weixin.qq.com/minigame/dev/reference/configuration/app.html
- DevTools project configuration:
  https://developers.weixin.qq.com/minigame/dev/devtools/projectconfig.html
- Mini Program lazy code loading reference:
  https://developers.weixin.qq.com/miniprogram/dev/framework/ability/lazyload.html

Note:

- I did not find a current official page that explicitly codifies the "200K per image/audio file" audit rule for minigames. I treated that item as a DevTools audit constraint and enforced it in the local validation script.

## Alignment

### 1. Root Entry Files

The active minigame entry files are:

- `game.js`
- `game.json`
- `project.config.json`

`game.js` is the root bootstrap file required by WeChat minigame projects. `game.json` is present at the project root and is used for minigame runtime configuration.

### 2. DevTools Project Type

`project.config.json` is configured for a minigame project through:

- `compileType: "minigame"`
- `libVersion: "latest"`
- the active AppID in `project.config.json` or `project.private.config.json`

`project.private.config.json` remains the correct place for local-only AppID overrides because DevTools gives it higher priority than the shared project config.

### 3. Runtime Structure

The runtime now follows a minigame-style layout:

- `game.js` bootstraps the project
- `src/minigame-app.js` creates the canvas, loads local settings, and binds WeChat lifecycle and touch handlers
- `src/minigame-runtime.js` owns gameplay, rendering, overlays, and state transitions
- `src/entities.js`, `src/audio.js`, `src/font.js`, and `src/settings.js` provide gameplay support modules

This keeps the gameplay loop independent from any page lifecycle or WXML structure.

### 4. Canvas and Input

The project uses the minigame runtime model rather than a page canvas:

- full-screen rendering through `wx.createCanvas()`
- touch input through `wx.onTouchStart`, `wx.onTouchMove`, `wx.onTouchEnd`, and `wx.onTouchCancel`
- resize handling through `wx.onWindowResize`
- background and foreground handling through `wx.onHide` and `wx.onShow`

No DOM APIs, `document`, `window.onload`, keyboard input, or page bindings are required for the active runtime.

### 5. Packaging Rules

The shared project config excludes non-runtime support files from packaging:

- `docs/`
- `scripts/`

This keeps the uploaded package focused on the minigame runtime and local assets.

### 6. Audio and Assets

The active runtime loads local assets directly from the project package:

- image assets from `images/`
- audio assets from `audio/`
- the shared `Marker Felt` font asset from `fonts/marker-felt.ttf`
- background music plus pooled sound effects through `wx.createInnerAudioContext()`
- canvas text styling through a shared `wx.loadFont()` attempt with system-font fallback

Asset paths are resolved from the minigame package root.

The project also enforces a local asset budget:

- every image and audio asset in the package must stay at or below 200 KiB
- the packaged font asset is also checked against the same local limit
- `scripts/validate.js` fails if any supported asset exceeds that limit
- validation now runs against the active packaged runtime set after the unused legacy media cleanup

### 7. Gameplay UX

The minigame build includes:

- a dedicated cover screen with title art, briefing text, plane preview, and author credit
- touch drag movement
- auto fire
- enemy waves, collisions, scoring, and level progression
- formation-style attack groups with richer flight paths such as zigzag, swoop, arc, and hover motion
- heavier large-enemy pressure with signature fan volleys
- pre-fire warning sketches for incoming enemy bullet paths
- multi-phase large-enemy attack escalation
- pause, resume, restart, and game-over overlays inside the canvas runtime
- player HP, hit flash, hit audio, and a short invincibility window after non-lethal damage
- sprite-driven presentation with player, enemy, projectile, explosion, background, and button assets
- a focused arcade-style pickup set with shorter double-shot supply drops, occasional stronger firepower upgrades, and independent bomb air drops
- compact manual bomb inventory at the lower-left corner
- a local run leaderboard plus an open-data-context friend leaderboard entry, with in-panel local/friend tab switching when supported
- animated top-three badges inside the friend leaderboard view
- floating score text, banners, screen flash, shake, and vibration feedback
- BGM plus dedicated button, pickup, bomb, bullet, enemy-destruction, and game-over sound effects
- unified canvas-drawn typography across gameplay HUD, overlays, and the friend leaderboard through the packaged `Marker Felt` font, with a safe fallback when the runtime cannot load the local font
- best-score persistence through local storage

### 8. Known Scope

The active minigame build is a local single-player project. It does not currently include:

- custom backend or cloud services
- online ranking beyond the built-in friend leaderboard entry
- monetization
- remote content delivery

### 9. On-Demand Component Injection

The current project does not implement component on-demand injection.

Reason:

- the active build is a pure WeChat minigame runtime driven by `game.js` and `wx.createCanvas()`
- there are no Mini Program pages or custom components left in the package
- the official minigame `game.json` reference does not expose a `lazyCodeLoading` / `requiredComponents` style configuration for this runtime model
- the official lazy code loading page that documents `lazyCodeLoading: "requiredComponents"` belongs to the Mini Program framework, not the Minigame framework

For this project, the correct optimization path is keeping the runtime package small, removing unused files, and enforcing asset-size limits.

### 10. Open Data Context

The project now includes an `openDataContext/` subdomain entry for friend leaderboard rendering.

The main runtime:

- writes the player best score through `wx.setUserCloudStorage()`
- opens the friend leaderboard through `wx.getOpenDataContext()` when supported
- falls back to a local device leaderboard when the open data context is unavailable
- still requires verification in WeChat DevTools or on a real device because friend data availability depends on the platform environment

## Recommended Next Steps

- continue refining sprite/UI alignment on narrow devices
- keep watching for newly orphaned files when the active runtime asset set changes
- complete final real-device verification in WeChat DevTools before release
