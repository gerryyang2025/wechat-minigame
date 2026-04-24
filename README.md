# WeChat Minigame Projects

This repository maintains multiple WeChat minigame projects.

Each top-level directory is a standalone project.

## Projects

- [`plane-game`](./plane-game/): a sketch-style shooter with hand-drawn visuals, canvas rendering, touch controls, layered power-ups, and local plus friend leaderboard support
- [`plane-game2`](./plane-game2/): a sprite-driven arcade shooter with packaged art and audio, HP-based survivability, local plus friend leaderboard support, and a more focused pickup set

## Project Focus

- Use `plane-game` if you want the sketch-style, paper-drawn variant with richer experimental mechanics.
- Use `plane-game2` if you want the sprite-first arcade variant with tighter combat rules and packaged presentation assets.

## Conventions

- Keep all documentation in English for consistency across projects.
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

## Friend Leaderboard Flow

Projects that support friend ranking use the WeChat open data context model:

```text
Player finishes a run
  -> main runtime writes best score with wx.setUserCloudStorage()
  -> main runtime opens the leaderboard overlay
  -> main runtime sends showFriendLeaderboard to openDataContext
  -> openDataContext reads friend data with wx.getFriendCloudStorage()
  -> openDataContext renders into sharedCanvas
  -> main runtime draws sharedCanvas inside the leaderboard panel
```

Detailed references:

- [plane-game friend leaderboard flow](./plane-game/docs/FRIEND_LEADERBOARD_DATA_FLOW.md)
- [plane-game2 friend leaderboard flow](./plane-game2/docs/FRIEND_LEADERBOARD_DATA_FLOW.md)

## Adding a Project

- Create a new top-level directory with a clear kebab-case name.
- Keep the project self-contained.
- Add a project `README.md` in English.
- Add a local config example instead of committing private settings.
- Document how to run, validate, and release the project.

## Documentation

- [plane-game README](./plane-game/README.md)
- [plane-game2 README](./plane-game2/README.md)
