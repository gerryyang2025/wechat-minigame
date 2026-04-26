# WeChat Minigame Adaptation Plan

## Goal

Recreate the core gameplay loop and presentation structure of the reference Marvel-themed platformer inside `marvel-game`, while adapting the control model and runtime architecture to fit WeChat minigame constraints.

This plan covers:

- gameplay parity targets
- mobile touch-control redesign
- WeChat minigame runtime structure
- phased implementation scope
- main risks and constraints

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

The main reasons are:

- the reference project is Phaser + DOM + keyboard driven
- WeChat minigames should avoid relying on DOM UI and keyboard input
- the reference asset set is large and must be compressed and filtered for minigame packaging
- touch input needs a different combat layout than the original keyboard scheme

The correct strategy is:

1. preserve the reference game loop and role differentiation
2. rebuild the runtime in a minigame-native structure
3. replace keyboard controls with touch-first mobile controls
4. replace DOM overlays with canvas-rendered UI

## Recommended Scope

### Keep from the Reference Game

- title screen to character select to level progression
- three selectable heroes
- hero-specific combat identity
- side-view platformer movement
- enemy waves in early levels
- a boss fight in the final level
- HP-based combat
- pause, game over, victory, and full-completion screens

### Adapt for WeChat Minigame

- keyboard input to touch controls
- DOM HUD to canvas HUD
- DOM buttons to in-canvas touch targets
- desktop scene transitions to lightweight mobile-friendly overlays
- large desktop asset set to compressed minigame asset subsets

### Avoid in the First Playable Version

- direct Phaser scene-for-scene porting
- video-based animation helpers
- desktop-style dense HUD text
- too many simultaneous active buttons on small screens
- friend leaderboard and share extensions before the core combat loop is stable

## Reference Gameplay Breakdown

### Scene Flow

Recommended minigame flow:

```text
Boot
  -> Preload
  -> Title
  -> Character Select
  -> Level 1
  -> Level 2
  -> Level 3 Boss
  -> Victory / Game Complete
  -> Restart or Return to Character Select
```

### Core Play Loop

Each level should follow this loop:

1. spawn the selected hero into a side-view stage
2. move through a short platforming segment
3. fight enemy units
4. survive hazards and maintain HP
5. reach the stage exit or defeat the boss
6. enter the next stage or show a result scene

### Hero Differentiation

The reference game distinguishes heroes through movement and combat identity. That should stay intact.

- Iron Man:
  fast movement, ranged pressure, beam-style ultimate
- Thor:
  balanced movement, strong melee, thrown hammer skill, lightning-style ultimate
- Hulk:
  slower heavier movement, larger HP pool, close-range burst, charge and slam skills

### Combat Layers

The reference input model supports:

- move
- jump
- basic attack
- ranged or character skill
- ultimate
- pause

On mobile, that exact mapping should be reduced to a clearer thumb-friendly layout.

## Mobile Touch Control Redesign

## Control Principles

- one thumb for movement
- one thumb for jump and combat
- no precision gestures required during heavy combat
- high-priority actions should be reachable without finger travel across the screen

### Recommended Layout

#### Left Side

- large hold zone for horizontal movement
- simple two-direction platformer control is preferred over a floating analog stick

Recommended behavior:

- hold left area: move left
- hold right area: move right

This is more reliable for a platformer than a free joystick.

#### Right Side

- `Jump` button: largest and highest priority
- `Attack` button: primary combat input
- `Skill` button: smaller button above or beside attack
- `Ultimate` button: gated by cooldown and placed higher to avoid accidental taps

#### Top Right

- pause icon button

#### Character Select

- swipe or tap character cards
- one explicit `Start` button

### Proposed Touch Mapping

```text
Left thumb:
  Left hold  -> move left
  Right hold -> move right

Right thumb:
  Jump       -> jump / double jump
  Attack     -> melee or primary attack
  Skill      -> hero skill
  Ultimate   -> ultimate ability

Top right:
  Pause
```

### Why This Mapping Is Better Than a Literal Keyboard Port

- platformer movement needs reliable left-right precision
- jump and attack must be available without mode switching
- small mobile screens punish layouts with more than four frequent action buttons
- keyboard parity is less important than readable mobile action rhythm

## WeChat Minigame Runtime Proposal

The project should use a minigame-native structure similar to the existing projects in this repository, not a browser-only Phaser DOM setup.

### Proposed Directory Structure

```text
marvel-game/
├── README.md
├── WECHAT_ADAPTATION_PLAN.md
├── game.js
├── game.json
├── project.config.json
├── openDataContext/
├── src/
│   ├── assets.js
│   ├── audio.js
│   ├── game-meta.js
│   ├── input.js
│   ├── minigame-app.js
│   ├── minigame-runtime.js
│   ├── physics.js
│   ├── renderer.js
│   ├── scenes/
│   ├── entities/
│   ├── levels/
│   └── utils.js
├── images/
├── audio/
└── scripts/
```

### Scene Model

Recommended canvas scene set:

- `BootScene`
- `LoadingScene`
- `TitleScene`
- `CharacterSelectScene`
- `LevelScene`
- `PauseOverlay`
- `GameOverOverlay`
- `VictoryOverlay`
- `CompleteOverlay`

This can be implemented either as:

- a scene stack inside one runtime
- or a state-machine-driven renderer with per-state update and render handlers

For a minigame, the second option is usually lighter and easier to control.

## Feature Parity Plan

### Phase 1: Playable Vertical Slice

Target:

- title screen
- character select
- one playable hero
- one level
- move, jump, attack, skill, ultimate
- one enemy type
- pause and game over

Purpose:

- prove physics, touch controls, and combat readability on mobile

### Phase 2: Core Parity

Target:

- all three heroes
- all three level backdrops
- enemy wave flow
- boss fight
- HP UI
- victory and completion scenes
- hero and enemy multi-frame animation switching
- chapter transition overlays between levels
- a fuller boss second phase with telegraphed special attacks
- stage-specific set pieces that help each chapter read as a different combat space
- enemy encounter variety through skirmisher, artillery, and brute sentry behaviors
- aerial drone patrols so later stages are not limited to ground-only pressure
- encounter-gated ambush groups so mixed enemy pressure ramps in readable beats instead of all spawning at once
- encounter-complete feedback and small recovery beats so touch players can read when a pressure spike has actually ended
- a lightweight encounter HUD chip so touch players can tell which ambush is active and how many enemies remain
- result overlays that grade each chapter clear so players get stronger mobile-readable feedback than a simple win/lose card
- clearer hit, hurt, knockback, landing, hero hurt/fall, enemy stagger/fall, and death presentation
- hero-specific hit effects so each skill family reads differently on mobile
- hero-specific landing effects so skill impact zones read before and during payoff
- gameplay-layer screen shake
- a short boss weakened window after the finisher to reward successful survival
- a short stagger buffer after the weakened window so the punish phase stays readable on touch devices
- a clearer weakened-state visual package so the punish window reads on mobile
- route guidance cues that point the player toward targets, bosses, or punish windows
- chapter micro-events that fire short callouts during traversal and boss threshold shifts
- first-contact combat callouts that explain new enemy roles when they first enter play
- a temporary boss arena lock during the final duel

Purpose:

- reach recognizable gameplay parity with the reference game

### Phase 3: Minigame Polish

Target:

- performance cleanup
- package-size cleanup
- touch tuning
- audio balancing
- mobile HUD readability
- WeChat lifecycle handling
- final pass on stage-transition pacing and combat readability
- final balancing of boss weakened-window fairness and enemy pressure
- final tuning for chapter-grade thresholds so clear ranks match real mobile difficulty
- final tuning for hero-select spacing and smaller-phone readability

Purpose:

- make the port feel native instead of just functional

## UI Adaptation Strategy

The reference project uses browser DOM overlays for:

- HUD
- pause menu
- game over screen
- victory screen

For WeChat minigame, these should be redrawn on canvas.

### HUD

Keep:

- player HP
- boss HP
- active character
- skill and ultimate cooldown state
- pause button

Reduce:

- desktop-style control hints
- always-visible long text labels

### Menus

Prefer:

- short labels
- large tap-safe buttons
- portrait-safe centered card layout

Avoid:

- web-page-style stacked text blocks
- small hover-oriented buttons

## Physics and Gameplay Notes

### Platforming

The reference game depends on:

- grounded jumping
- air control
- double jump for some heroes
- enemy patrol and chase behavior
- knockback and invulnerability windows

These should be retained.

Recommended implementation rules:

- deterministic gravity and collision resolution
- fixed update step where possible
- coyote time and jump buffering for mobile forgiveness
- short post-hit invulnerability and flicker feedback

### Combat

Preserve:

- melee attack timing
- ranged or skill identity by hero
- ultimate with cooldown and stronger feedback

Adapt:

- reduce overly dense simultaneous actions on mobile
- let basic attack auto-face toward the last movement direction
- allow skill and ultimate buttons to gray out on cooldown

### Boss Fight

Keep the final-level boss structure, but simplify the first implementation:

- one clear boss HP bar
- one basic chase pattern
- one heavy melee pattern
- one dash or burst skill

Additional attack phases can be layered in after the first boss fight is playable.

## Asset Strategy

The reference asset pack includes more than a mobile minigame needs.

### Use

- sprite frames
- portraits
- backgrounds
- level tilemaps
- selected SFX
- selected BGM

### Avoid in the First Version

- video helper assets
- duplicate animation variants not needed in gameplay
- unused portraits and redundant effects

### Packaging Requirements

Before implementation, assets should be filtered for:

- current scene usage
- mobile readability
- minigame package size constraints
- per-file size safety for review and upload

## Risks

### 1. Input Complexity Risk

A four-action platform fighter can become crowded on mobile.

Mitigation:

- prioritize jump and basic attack
- keep skill and ultimate visually separated and cooldown-gated
- avoid adding more active inputs beyond the reference core set

### 2. Runtime Port Risk

A direct Phaser browser port will not map cleanly to a WeChat minigame runtime.

Mitigation:

- rebuild scene flow and gameplay logic in a minigame-native canvas runtime
- treat the reference project as a gameplay and asset guide, not a codebase to copy literally

### 3. Package Size Risk

The reference asset set is large.

Mitigation:

- import only assets required for the current milestone
- compress and trim early
- avoid shipping videos and unused duplicate frames

### 4. IP and Distribution Risk

The reference game is Marvel-themed.

Mitigation:

- confirm the allowed usage scope before any public release
- if needed, keep implementation structure reusable so branding can be swapped later

## Recommended Implementation Order

1. scaffold the minigame project structure inside `marvel-game`
2. build a touch input system for platformer movement and combat
3. implement a single-level playable slice with one hero
4. add reusable enemy and boss foundations
5. add the character select flow and all three heroes
6. add remaining levels and completion scenes
7. optimize assets, performance, and mobile UX

## Current Implementation Status

Phase 1 has now started in the top-level `marvel-game/` directory.

Implemented:

- minigame project scaffold
- `game.js` and `game.json` bootstrap
- `project.config.json` and local config example
- validation script
- canvas-based runtime bootstrap
- title screen
- character select screen
- three-stage campaign structure
- touch controls for movement, jump, attack, skill, ultimate, and pause
- three differentiated heroes
- enemy patrol, chase, melee pressure, and ranged boss pressure
- a final boss encounter in stage three
- imported portraits, sprite frames, tile textures, projectile art, and key effect images
- one shared background track is enabled in the active build, while combat SFX remain disabled
- chapter banners and boss phase announcements
- pause, game over, stage-clear, and victory overlays

The current build supports:

- horizontal movement
- jump and limited air-jump behavior based on the selected hero
- ranged, melee, dash, beam, lightning, and slam-style hero abilities
- HP-based combat for both the player and enemies
- stage exits that unlock after enemies are cleared
- multi-level progression into a final boss stage
- a boss HP bar and boss projectile pressure in the final arena

Still pending:

- richer hit effects and transitions
- finer mobile balance tuning
- richer boss phases and encounter variety
- broader animation-frame coverage beyond the first imported stills
- later WeChat platform extensions

## Validation Status

Run:

```bash
node scripts/validate.js
```

The current implementation is meant to be verified in WeChat DevTools as a playable campaign baseline before expanding into richer boss phases, denser animation coverage, and presentation polish.

## Practical Conclusion

This project is worth doing and is technically feasible, but only if it is treated as a guided adaptation rather than a literal port.

The best path is:

- preserve the reference game loop
- redesign controls for two-thumb mobile play
- rebuild UI and flow for canvas-based WeChat minigame usage
- deliver the game in phased milestones

The best next step after the current implementation is:

1. verify the current campaign flow in WeChat DevTools
2. tune touch controls, jump timing, and boss difficulty
3. add richer boss phases, broader animation usage, and smoother stage transitions
