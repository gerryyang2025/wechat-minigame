# Marvel Game

This directory contains a WeChat minigame adaptation of a Marvel-themed action platformer.

## Documents

- [WeChat Adaptation Plan](./docs/WECHAT_ADAPTATION_PLAN.md)

## Current Slice

The current build includes a first playable vertical slice:

- title screen
- character select
- three selectable heroes
- one side-view combat level
- touch controls for movement and combat
- pause, game over, and victory overlays

## Current Touch Controls

- left side: hold left or right zones to move
- right side:
  - `跳`: jump
  - `攻`: primary attack
  - `技`: hero skill
  - `绝`: ultimate
- top right: pause

## Validation

```bash
node scripts/validate.js
```

