# WeChat Minigame Adaptation Plan

## Goal

Recreate the core gameplay loop and presentation structure of the reference Marvel-themed platformer inside `marvel-game`, while adapting the control model and runtime architecture to fit WeChat minigame constraints.

## Assessment Summary

The reference game is a side-scrolling action platformer with:

- a title screen
- a character select screen
- three playable heroes
- three levels
- a boss stage
- platforming movement
- melee, ranged, skill, and ultimate actions
- pause, game over, victory, and game-complete flows

This design is feasible for a WeChat minigame, but it should not be ported literally.

The correct strategy is:

1. preserve the reference game loop and role differentiation
2. rebuild the runtime in a minigame-native structure
3. replace keyboard controls with touch-first mobile controls
4. replace DOM overlays with canvas-rendered UI

## Mobile Touch Control Redesign

### Control Principles

- one thumb for movement
- one thumb for jump and combat
- no precision gestures required during heavy combat
- high-priority actions should be reachable without finger travel across the screen

### Recommended Layout

```text
Left thumb:
  Left hold  -> move left
  Right hold -> move right

Right thumb:
  Jump       -> jump / double jump
  Attack     -> basic attack
  Skill      -> hero skill
  Ultimate   -> ultimate ability

Top right:
  Pause
```

## Runtime Structure

The project should use a minigame-native canvas structure:

```text
marvel-game/
├── game.js
├── game.json
├── project.config.json
├── docs/
├── scripts/
└── src/
```

Recommended scene flow:

```text
Boot
  -> Title
  -> Character Select
  -> Level Slice
  -> Pause / Game Over / Victory
```

## Gameplay Targets

### Keep from the Reference Game

- three selectable heroes
- side-view platform movement
- hero-specific attack identity
- HP-based combat
- stage completion flow

### Adapt for WeChat Minigame

- keyboard input to touch controls
- DOM HUD to canvas HUD
- desktop menus to large touch-safe overlays
- asset-heavy scenes to lightweight staged rollout

## Feature Phases

### Phase 1: Playable Vertical Slice

Target:

- title screen
- character select
- one playable hero set
- one level
- move, jump, attack, skill, ultimate
- one enemy type
- pause and game over

### Phase 2: Core Parity

Target:

- all three heroes
- all three level backdrops
- enemy wave flow
- boss fight
- victory and completion scenes

### Phase 3: Minigame Polish

Target:

- performance cleanup
- package-size cleanup
- touch tuning
- audio balancing
- mobile HUD readability

## Risks

### Input Complexity

A four-action platform fighter can become crowded on mobile.

Mitigation:

- prioritize jump and basic attack
- keep skill and ultimate visually separated and cooldown-gated
- avoid adding more active inputs beyond the core set

### Runtime Port Risk

A direct Phaser browser port will not map cleanly to a WeChat minigame runtime.

Mitigation:

- rebuild flow and gameplay in a minigame-native canvas runtime
- treat the reference project as a gameplay guide, not a codebase to copy literally

### Package Size Risk

The reference asset set is large.

Mitigation:

- import only assets required for the current milestone
- compress and trim early
- avoid shipping videos and unused duplicate frames

## Current Implementation Status

The current repository state has started Phase 1.

Implemented:

- minigame project scaffold
- canvas-based runtime bootstrap
- title screen
- character select screen
- one playable level slice
- touch controls for movement, jump, attack, skill, ultimate, and pause
- three differentiated heroes
- one enemy wave loop
- pause, game over, and victory overlays

Still pending:

- multi-level progression
- boss fight parity
- asset-pack visual migration
- audio integration
- richer effects and transitions
- later WeChat platform extensions

## Practical Conclusion

This project is feasible, but it should be delivered as a guided minigame adaptation rather than a literal desktop port.

The best next step after the current implementation is:

1. verify the first playable slice in WeChat DevTools
2. tune touch controls and platformer feel
3. add boss and multi-level progression

