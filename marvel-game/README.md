# Marvel Game

This directory contains a WeChat minigame adaptation of a Marvel-themed action platformer.

## Documents

- [WeChat Adaptation Plan](./WECHAT_ADAPTATION_PLAN.md)

## Current Build

The current build includes a first playable campaign slice:

- title screen
- character select
- three selectable heroes
- three side-view stages
- a final boss stage inside the third level
- touch controls for movement and combat
- imported portraits, sprite frames, tile textures, and skill effect images, with one shared background track enabled and combat SFX currently disabled
- hero-specific hit effects and landing effects for repulsor, thunder, and gamma-heavy skills
- richer idle, run, jump, and attack frame switching for heroes and enemies
- hit flash, knockback, landing feedback, hero hurt/fall reactions, enemy stagger/fall reactions, and death-frame playback for stronger combat readability
- chapter banners, dedicated stage-transition overlays, and boss phase announcements
- chapter micro-events that trigger short in-stage callouts as the player advances or pushes boss thresholds
- stage-specific set pieces such as wrecks, beacons, cannons, reactor cores, and the final throne room backdrop
- enemy encounter variety through skirmisher, artillery, and brute sentry variants plus aerial drone patrols with distinct pressure patterns
- encounter-gated ambush groups that activate later in the level instead of front-loading every enemy at stage start
- encounter-complete callouts, `CLEAR` route guidance, and small mid-fight recovery moments after finishing tagged ambush groups
- an encounter HUD chip that shows the active ambush title and remaining enemy count
- chapter result overlays that now include an action rank and a short performance note instead of only basic win/lose text
- first-contact combat callouts that explain new enemy roles when the player first reaches them in a stage
- a stronger boss second phase with dash, nova, a finishing sweep attack, a brief weakened window after the finisher, projectile clear plus stagger recovery protection, a physical arena lock during the duel, impact payoff, screen shake, and a weakened-state visual package
- dynamic route guidance that points to targets, bosses, or punish windows
- a simplified campaign flow: choose a hero, start from chapter 1, and advance straight through all three stages
- pause, game over, stage-clear, and campaign-complete overlays

## Current Touch Controls

- left side: virtual joystick movement
- right side:
  - `跳`: jump
  - `攻`: primary attack
  - `技`: hero skill
  - `绝`: ultimate
- top right: pause

## Next Focus

- verify the current campaign flow in WeChat DevTools
- tune movement, jump timing, boss phase-two pressure, and touch hit areas
- refine sprite timing, effect layering, and per-hero combat readability
- tune aerial-drone spacing, projectile readability, and mixed air-ground encounter pressure
- tune action-rank thresholds so stage clear grades feel fair across all three heroes
- tune hero-select card density and start-button spacing on smaller phones

## Validation

```bash
node scripts/validate.js
```
