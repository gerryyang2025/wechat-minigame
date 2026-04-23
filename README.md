# WeChat Minigame Projects

This repository maintains multiple WeChat game projects.

Each top-level directory is a standalone project.

## Projects

- [`plane-game`](./plane-game/): a WeChat minigame arcade shooter with canvas rendering, touch controls, audio, and power-ups

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

## Adding a Project

- Create a new top-level directory with a clear kebab-case name.
- Keep the project self-contained.
- Add a project `README.md` in English.
- Add a local config example instead of committing private settings.
- Document how to run, validate, and release the project.

## Documentation

- [Contributing Guide](./CONTRIBUTING.md)
- [plane-game README](./plane-game/README.md)
