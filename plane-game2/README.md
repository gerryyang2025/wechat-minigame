# plane-game2

`plane-game2` is a WeChat minigame arcade shooter that uses a root `game.js` entry and a full-screen canvas runtime.

This project is the sprite-driven variant in this repository. It uses a 2D arcade shooter presentation built from the packaged image and audio resources under `plane-game2/images/` and `plane-game2/audio/`.

## Entry Files

- `game.js`
- `game.json`
- `project.config.json`

## Current Features

- full-screen canvas rendering through `wx.createCanvas()`
- arcade background, title art, loading art, game-over art, and button art
- shared `Marker Felt` canvas typography loaded from `fonts/marker-felt.ttf`, with a safe system-font fallback when custom font loading is unavailable
- animated player sprite frames and sprite-based enemy rendering for small, medium, and large enemies
- sprite-based explosion sequences for the player and all enemy tiers
- drag movement with automatic shooting
- player HP, temporary post-hit invincibility, blink feedback, and dedicated hit audio
- score, best-score persistence, and survival-based difficulty progression
- richer enemy formations with zigzag, arc, swoop, and hover paths
- a focused arcade pickup set built around bomb air drops, double-shot supplies, and occasional stronger firepower upgrades
- shorter arcade-style double-shot windows and a faster upgraded fire rhythm
- manual bomb usage from the lower-left inventory capsule
- pause / resume / restart button treatments plus sprite-aligned stat cards inside pause and game-over overlays
- local device leaderboard plus an open-data-context friend leaderboard entry, with unified close buttons and local/friend tab switching
- BGM and sound effects for buttons, bullets, bomb usage, pickups, enemy destruction, level-up, and game-over
- inactive legacy images and audio have been removed from the active arcade branch
- local validation for JavaScript, JSON, and packaged asset size

## Running the Project

1. Open WeChat DevTools.
2. Create or import a **Minigame** project.
3. Import the `plane-game2` directory.
4. Use your own minigame AppID.
5. If needed, create `project.private.config.json` from `project.private.config.example.json`.

## Local Validation

Run the following command inside the project directory:

```bash
node scripts/validate.js
```

The script validates JavaScript syntax, JSON formatting, and the local 200 KiB per-file limit used for packaged image, audio, and font assets.

## Directory Guide

- `game.js`: minigame bootstrap entry
- `game.json`: minigame runtime configuration
- `src/minigame-app.js`: runtime bootstrap, canvas creation, and lifecycle wiring
- `src/minigame-runtime.js`: gameplay loop, rendering, touch handling, audio triggers, and overlays
- `src/entities.js`: player, enemy, projectile, explosion, and power-up entities
- `src/audio.js`: BGM and sound effect playback
- `src/font.js`: shared custom-font loading and canvas font helpers
- `src/game-meta.js`: title, slogan, cover copy, and share metadata
- `openDataContext/index.js`: friend leaderboard rendering inside the minigame open data context
- `audio/`: packaged audio assets
- `fonts/`: packaged custom font assets
- `images/`: packaged sprite, background, and UI assets
- `scripts/validate.js`: local validation script

## Reference Docs

- [WeChat Minigame Requirements](./docs/WECHAT_MINIGAME_REQUIREMENTS.md)
- [WeChat Minigame Release Checklist](./docs/WECHAT_MINIGAME_RELEASE_CHECKLIST.md)
- [Classic WeChat Plane Fighter Design Notes](./docs/CLASSIC_WECHAT_PLANE_FIGHTER_DESIGN.md)
- [Arcade Asset Migration Plan](./docs/ARCADE_ASSET_MIGRATION_PLAN.md)
