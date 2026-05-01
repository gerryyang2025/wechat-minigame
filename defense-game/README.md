# Defense Game

A portrait-first WeChat minigame tower defense experience.

This directory now contains a first playable WeChat-minigame scaffold:

- title screen
- two selectable portrait defense maps
- four tower roles
- three difficulty levels
- sixteen enemy waves per run
- shared sixteen-wave progression with an expanded enemy roster
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
- [ENEMY_ATTACK_SYSTEM_DESIGN.md](./ENEMY_ATTACK_SYSTEM_DESIGN.md): reference design for enemy attack abilities, tower durability, and role-based skills

## Current Scope

Current playable scope focuses on two replayable stages with:

- two maps
- two path layouts
- four tower types
- three selectable difficulties
- sixteen waves per run
- eighteen enemy roles across the full roster
- enemy attack abilities and tower durability pressure
- tower repair and temporary disable / debuff states
- wave countdown and start flow
- build, upgrade, sell, and pause interactions
- per-stage best wave tracking and title-screen stage selection

The current enemy pool mixes:

- baseline creeps for early-wave teaching
- sprint enemies that pressure the back half of the route
- armored enemies that reward focused fire
- ranged, control, and splash attackers that can harass towers directly
- elite and boss variants that appear in the same wave progression across all difficulties

Difficulty differences are now driven mainly by:

- starting gold and lives
- wave and spawn pacing
- enemy health, speed, armor, and pressure values
- enemy attack damage, attack cadence, and status duration values

Additional stage progression, richer meta systems, and more environment-specific art can still be added after the current core loop is stable.

## Current Files

- `game.js`, `game.json`, `project.config.json`: WeChat minigame entry and project config
- `src/minigame-app.js`: app boot and WeChat lifecycle bridge
- `src/minigame-runtime.js`: title, combat loop, HUD, and overlays
- `src/content.js`: map, tower, enemy, and wave data
- `scripts/validate.js`: local syntax and JSON validation
