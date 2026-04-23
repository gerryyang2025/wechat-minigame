# plane-game

`plane-game` is a WeChat minigame arcade shooter that uses a root `game.js` entry and a full-screen canvas runtime.

## Entry Files

- `game.js`
- `game.json`
- `project.config.json`

## Features

- full-screen canvas rendering through `wx.createCanvas()`
- a dedicated cover screen with title, slogan, compact briefing text, plane preview, and author credit
- touch drag movement for the player plane
- automatic shooting, enemy spawning, collision detection, scoring, and survival-based difficulty progression
- small, medium, and large enemy classes with differentiated score values
- medium enemies can fire downward bullets, and large enemies use a fan-shaped signature volley
- formation-style enemy waves with richer paths such as zigzag, swoop, arc, and hover patterns
- pre-fire warning sketches that hint enemy bullet paths before impact
- phase-based large-enemy escalation with stronger late-stage attack patterns
- pause, resume, restart, and game-over overlays inside the game runtime
- local audio for BGM, hit, level-up, start, and game-over events
- combat feedback such as muzzle flashes, floating score text, banners, screen flash, and vibration
- parachute-style supply drops for double-shot, firepower-upgrade, shield, bullet-clear, slow-time, and score-boost pickups, plus independent bomb air drops
- color-first supply readability with stronger per-item palette separation and optional labels only when the pickup is large enough to remain readable
- compact bomb and bullet-clear inventory capsules at the lower-left corner for manual defensive item use
- double-shot, firepower-upgrade, and shield states with remaining time shown in the HUD
- timed slow-motion and score-boost states shown in the HUD
- a local run leaderboard panel accessible from the game-over screen
- an open-data-context friend leaderboard entry from the game-over screen
- animated top-three medals inside the friend leaderboard panel
- local persistence for best score and user settings
- a lightweight validation script for JavaScript, JSON, and asset size checks

## Running the Project

1. Open WeChat DevTools.
2. Create or import a **Minigame** project.
3. Import the `plane-game` directory.
4. Use your own minigame AppID.
5. If needed, create `project.private.config.json` from `project.private.config.example.json`.

## Local Validation

Run the following command inside the project directory:

```bash
node scripts/validate.js
```

The script validates JavaScript syntax, JSON formatting, enforces a 200 KiB per-file limit for image and audio assets in the project package, and warns when an asset is close to that limit.

## Directory Guide

- `game.js`: minigame bootstrap entry
- `game.json`: minigame runtime configuration
- `src/minigame-app.js`: runtime bootstrap, canvas creation, and lifecycle wiring
- `src/minigame-runtime.js`: gameplay loop, rendering, touch handling, and overlays
- `src/entities.js`: player, enemy, projectile, explosion, and power-up entities
- `openDataContext/index.js`: hand-drawn friend leaderboard rendering inside the minigame open data context
- `src/audio.js`: BGM and sound effect playback
- `src/settings.js`: local settings persistence
- `project.config.json`: WeChat DevTools project configuration for the minigame
- `audio/`: local audio assets
- `images/`: project image assets
- `scripts/validate.js`: local validation script
- `project.private.config.example.json`: local private config template

## Reference Docs

- [WeChat Minigame Requirements](./docs/WECHAT_MINIGAME_REQUIREMENTS.md)
- [WeChat Minigame Release Checklist](./docs/WECHAT_MINIGAME_RELEASE_CHECKLIST.md)
- [Classic WeChat Plane Fighter Design Notes](./docs/CLASSIC_WECHAT_PLANE_FIGHTER_DESIGN.md)
