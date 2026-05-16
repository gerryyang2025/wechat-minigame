# WeChat Minigame Projects

This repository maintains multiple standalone WeChat minigame projects.

Each top-level directory is a standalone project.

## Projects

- [`plane-game`](./plane-game/): sketch-style shooter
- [`plane-game2`](./plane-game2/): sprite-driven arcade shooter
- [`defense-game`](./defense-game/): portrait-first tower defense
- [`marvel-game`](./marvel-game/): touch-first action-platformer
- [`jumpjump-game`](./jumpjump-game/): portrait jump-and-score timing game
- [`bad-north-game`](./bad-north-game/): low-poly 3D island-defense strategy game
- [`brick-breaker-game`](./brick-breaker-game/): Three.js brick-breaker with ball volleys, power-ups, progression, and a custom level editor

Project-specific features, controls, and implementation details are documented in each game's own `README.md`.

## Project Focus

- Use `plane-game` if you want a sketch-style shooter direction.
- Use `plane-game2` if you want a sprite-first arcade shooter direction.
- Use `defense-game` if you want a portrait tower-defense direction.
- Use `marvel-game` if you want a side-view action-platformer direction.
- Use `jumpjump-game` if you want a WeChat-style jump timing game with platform generation, charge control, local scores, and leaderboard UI.
- Use `bad-north-game` if you want a compact 3D island-defense direction with realtime squad movement, landing waves, and simplified tactical controls.
- Use `brick-breaker-game` if you want a portrait Three.js brick-breaker direction with drag aiming, paddle defense, falling bricks, power-ups, cannon upgrades, and custom level creation.

## Conventions

- Keep each project README focused on gameplay, setup, validation, and release notes.
- Do not commit local-only files such as `project.private.config.json`.
- Keep each project independently importable in WeChat DevTools.

## Quick Start

1. Clone the repository.
2. Open the project directory you want to work on.
3. Read that project's `README.md`.
4. Create `project.private.config.json` from the example file if needed.
5. Run the project's local validation script before committing changes.

## Common Structure

- `game.js`: minigame bootstrap entry
- `game.json`: minigame runtime configuration
- `project.config.json`: WeChat DevTools project configuration
- `src/`: gameplay runtime, rendering, input, audio, and support modules
- `openDataContext/`: friend leaderboard rendering when the project supports open data context
- `scripts/validate.js`: local syntax, JSON, and packaged-asset validation
- `README.md`: project-specific setup and feature notes

## Adding a Project

- Create a new top-level directory with a clear kebab-case name.
- Keep the project self-contained.
- Add a project `README.md`.
- Add a local config example instead of committing private settings.
- Document how to run, validate, and release the project.

## Documentation

- [WeChat Backend and Auth Guide](./WECHAT_BACKEND_AND_AUTH_GUIDE.md)
- [plane-game README](./plane-game/README.md)
- [plane-game2 README](./plane-game2/README.md)
- [defense-game README](./defense-game/README.md)
- [marvel-game README](./marvel-game/README.md)
- [jumpjump-game README](./jumpjump-game/README.md)
- [bad-north-game README](./bad-north-game/README.md)
- [brick-breaker-game README](./brick-breaker-game/README.md)
