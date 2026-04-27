# Defense Game

A portrait-first WeChat minigame tower defense experience.

This directory now contains a first playable WeChat-minigame scaffold:

- title screen
- two selectable portrait defense maps
- four tower roles
- five enemy waves
- build, upgrade, and sell interactions
- pause, victory, and game-over overlays

## Goal

Build a polished tower defense loop inside a WeChat minigame-friendly runtime:

- title screen
- two polished playable defense stages
- four tower roles with clear combat identities
- enemy wave progression
- currency, lives, placement, upgrade, and sell flow
- pause, victory, and game-over overlays

## Design Direction

The game focuses on a cute cat-vs-household-chaos fantasy, with interaction and runtime choices tuned for:

- touch-first controls
- canvas-rendered UI
- small-screen readability
- minigame package limits
- lower implementation complexity than the browser Phaser + DOM version

## Document Map

- [WECHAT_ADAPTATION_PLAN.md](./WECHAT_ADAPTATION_PLAN.md): detailed gameplay and runtime adaptation plan
- [ART_ASSET_OPTIMIZATION_STATUS.md](./ART_ASSET_OPTIMIZATION_STATUS.md): current art-resource migration status, completed items, and remaining gaps

## Current Scope

Current playable scope focuses on two short stages with:

- two maps
- two path layouts
- four tower types
- three regular enemy types plus one heavier late-wave enemy
- wave countdown and start flow
- build, upgrade, sell, and pause interactions
- per-stage best wave tracking and title-screen stage selection

Additional stage progression, more enemy families, and richer meta systems can be added after the core loop is stable.

## Current Files

- `game.js`, `game.json`, `project.config.json`: WeChat minigame entry and project config
- `src/minigame-app.js`: app boot and WeChat lifecycle bridge
- `src/minigame-runtime.js`: title, combat loop, HUD, and overlays
- `src/content.js`: map, tower, enemy, and wave data
- `scripts/validate.js`: local syntax and JSON validation
