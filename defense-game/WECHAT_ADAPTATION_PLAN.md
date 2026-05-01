# WeChat Minigame Adaptation Plan

## Status Note

This file records the original first-playable planning phase for `defense-game`.

The current implementation has already moved beyond that initial scope:

- two playable stages instead of one
- three selectable difficulties
- sixteen waves per run
- a broader enemy roster with multiple elite and boss variants

Use [README.md](./README.md) for the current gameplay scope, and treat this document as historical design rationale plus phased implementation notes.

## Goal

Recreate the core gameplay loop of `/Users/gerry/Proj/github/new/opengame-agent/demo_towerDefense_hajimi` inside `defense-game`, while adapting the interaction model, UI structure, and technical architecture to fit WeChat minigame constraints.

This document covers:

- reference gameplay breakdown
- WeChat-specific design adjustments
- touch-control and UI redesign
- runtime architecture proposal
- scope reduction for the first playable version
- implementation phases and risks

## Assessment Summary

The reference project is a browser-first Phaser tower defense game with:

- a title screen
- one playable level
- tower placement on a grid
- wave progression
- tower upgrades and tower selling
- currency and lives
- breakable obstacles
- boss-style final wave behavior
- DOM-supported HUD and desktop mouse interactions

This design is feasible for a WeChat minigame, but it should not be copied literally.

The main adaptation reasons are:

- WeChat minigames should avoid DOM-heavy HUD and overlay logic
- mobile touch input needs larger, clearer placement and upgrade interactions
- the original project relies on Phaser scene + browser UI patterns that do not map cleanly to an existing canvas-only minigame codebase
- package size, asset count, and readability need stronger control on mobile

The right strategy is:

1. keep the tower defense loop and theme
2. simplify secondary systems for the first version
3. rebuild the game in a minigame-native canvas structure
4. redesign all interactions around touch-first play

## Reference Gameplay Breakdown

## Core Fantasy

The reference game is a cute, top-down tower defense scenario:

- the player defends a target inside a room
- cat towers attack invading household-themed enemies
- the economy uses cat-food-style currency
- each tower has a clear attack identity

This fantasy should stay intact.

## Reference Scene Flow

Reference flow:

```text
TitleScreen
  -> Level1
  -> Victory / GameOver
  -> TitleScreen
```

Recommended WeChat flow:

```text
Boot
  -> Preload
  -> Title
  -> Stage Brief
  -> Level 1
  -> Victory / Game Over
  -> Restart or Return to Title
```

## Reference Core Systems

The reference game includes:

- starting gold
- starting lives
- buildable tower slots
- multiple tower types
- enemy waves
- between-wave countdown
- tower upgrade
- tower sell
- breakable obstacles
- combo reward logic

Not all of these need to ship in the first minigame version.

## Recommended Scope for WeChat Version

### Keep in the First Playable Version

- title screen
- one defense map
- one defend target
- four tower types
- three to five waves
- gold and lives
- build, upgrade, and sell loop
- pause
- game over
- stage clear

### Simplify for the First Playable Version

- obstacles should be reduced or removed if they complicate touch clarity
- combo rewards can be postponed
- boss wave can be represented as a heavy elite wave instead of a full special encounter
- tower info should be compact and always readable on portrait mobile screens

### Avoid in the First Playable Version

- multi-panel desktop-style HUD
- tiny grid targets that are hard to tap
- too many upgrade stats shown at once
- excessive on-screen debug or reward popups
- DOM-based menus

## WeChat Design Changes

## Input Model Redesign

The reference game assumes desktop mouse precision.

The WeChat version should be built around:

- tap to select tower type
- tap a build slot to place
- tap an existing tower to open a compact upgrade/sell panel
- tap a wave button to start next wave early

### Recommended Touch Loop

```text
Tap tower card
  -> highlights selected tower type
Tap build slot
  -> place tower if affordable
Tap existing tower
  -> open compact action panel
Tap wave button
  -> start next wave
```

### What to Avoid

- drag-to-place tower placement
- tiny hover states that depend on cursor precision
- upgrade panels with more than 2 to 3 visible actions

## Screen Layout Recommendation

The game should be portrait-first, with the battlefield centered and the HUD arranged around it.

### Recommended Layout

#### Top Area

- lives
- gold
- wave number
- pause button

#### Main Area

- battlefield
- path
- defend target
- build slots
- enemies and towers

#### Bottom Area

- tower build bar with four large tower buttons
- selected tower info card when relevant
- next wave button

This layout aligns better with existing minigames in this repo than a desktop top-and-side HUD.

## Visual Adaptation Recommendation

## Keep from the Reference

- cute cat character identity
- bright, soft colors
- rounded, toy-like objects
- clear difference between tower archetypes

## Adapt for WeChat

- reduce clutter in the playfield
- increase contrast for path, slots, enemies, and defend target
- enlarge touch targets beyond pure visual size
- avoid tiny text labels on map objects

## Typography

Use the same broad direction already proven in `plane-game` and `plane-game2`:

- decorative title font for title and result headings
- readable, heavier UI font for currency, wave, upgrade, and button labels

Do not use decorative text for dense gameplay information.

## Gameplay Design Proposal

## Stage Structure

For the first WeChat version, use one curated stage with:

- one enemy spawn entrance
- one defend target
- one main path with a few bends
- 8 to 12 build slots
- enough spacing for clear touch placement

This should feel complete without requiring multiple maps.

## Economy

Recommended first-pass tuning:

- start gold: `120`
- start lives: `10`
- wave countdown: `5s`
- sell refund: `70%`

This matches the spirit of the reference project while remaining easy to tune inside a minigame loop.

## Tower Roles

Keep the same four roles from the reference, but simplify their presentation.

### 1. Tabby

- low cost
- fast fire rate
- general-purpose single-target tower

### 2. Siamese

- high range
- slow fire rate
- high single-hit damage

### 3. Chonky

- splash damage
- short range
- good against clusters

### 4. Boba

- low direct damage
- applies slow
- supports other towers

### WeChat UI Rule

Do not expose too many raw stats at once.

Each tower button should show:

- icon
- cost
- one short role label

Example:

- `Tabby · Fast`
- `Siamese · Sniper`
- `Chonky · Splash`
- `Boba · Slow`

## Enemy Roles

Recommended first-pass enemy set:

- light unit
- medium unit
- tank unit
- one late-wave elite

The mailman boss fantasy from the reference can be postponed until the base loop is stable.

## Upgrade and Sell Flow

When a tower is tapped:

- show a compact radial or card panel
- display current level
- show only:
  - `Upgrade`
  - `Sell`
  - brief role or next upgrade summary

Avoid long stat tables.

## Result Screens

Use the same minigame UI discipline already developed in the repo:

- short title
- 2 to 4 summary metrics
- one primary restart button
- one secondary back button

Recommended summary items:

- waves cleared
- remaining lives
- final gold spent or total kills

## Technical Runtime Proposal

## Suggested Directory Structure

```text
defense-game/
├── README.md
├── WECHAT_ADAPTATION_PLAN.md
├── game.js
├── game.json
├── project.config.json
├── project.private.config.example.json
├── src/
│   ├── minigame-app.js
│   ├── minigame-runtime.js
│   ├── content.js
│   ├── assets.js
│   ├── audio.js
│   ├── game-meta.js
│   └── utils.js
├── images/
├── audio/
└── scripts/
```

## Runtime Design Principles

Unlike the reference Phaser + DOM structure, this version should:

- render everything on canvas
- keep level data in plain config objects
- keep HUD and overlays in the same runtime
- avoid scene explosion for a small one-level first version

### Suggested Internal Modules

#### `content.js`

Should define:

- map geometry
- path points
- build slots
- wave definitions
- tower templates
- enemy templates

#### `minigame-runtime.js`

Should handle:

- title screen
- stage start
- game loop
- tower placement
- enemy pathing
- projectile logic
- result overlays
- pause overlay

#### `assets.js`

Should provide:

- image manifest
- audio manifest
- preload helpers

#### `audio.js`

Should provide:

- BGM play / stop
- SFX play helpers
- safe no-op behavior when audio is not available

## WeChat-Specific Interaction Notes

## Placement Readability

Because touch precision is lower than mouse precision:

- build slots must be visibly larger than the exact collision area
- selected slot highlighting should be very obvious
- invalid placement feedback must be immediate

## Upgrade Panel Behavior

To keep the UI clean:

- only one tower panel should be open at a time
- tapping outside closes the panel
- tapping another tower switches the panel target

## Pause and Result Pages

Use the same layout lessons already learned from `plane-game` and `plane-game2`:

- remove redundant labels
- keep vertical spacing generous
- keep one primary action visually dominant
- avoid showing live gameplay HUD behind modal overlays

## Difficulty Tuning Recommendation

The first version should feel readable and complete before it feels deep.

Recommended approach:

1. make enemy pathing and targeting easy to read
2. ensure first two waves are forgiving
3. ensure at least two viable tower mixes can beat the stage
4. tune around touch usability, not desktop speed

## Recommended Initial Implementation Phases

## Phase 1: Design and Scaffold

- create project docs
- scaffold minigame project structure
- add game config and placeholder assets

## Phase 2: Core Loop

- render map
- spawn enemies along path
- place towers
- attack and damage loop
- gold and lives
- victory / loss

## Phase 3: Interaction Polish

- tower select bar
- tower panel
- pause
- wave start UI
- result overlays

## Phase 4: Content Polish

- final tuning
- better art
- better audio
- mild juice and feedback

## Main Risks

## Risk 1: Touch Placement Feels Clumsy

Mitigation:

- large slots
- obvious selection state
- minimal tower action panel

## Risk 2: Battlefield Gets Visually Busy

Mitigation:

- limit on-screen enemy count early
- reduce decorative clutter
- keep projectile visuals simple

## Risk 3: Porting Desktop UX Too Literally

Mitigation:

- redesign UI around a bottom build bar
- remove hover-based assumptions
- keep overlays short and modal

## Risk 4: Scope Creep

Mitigation:

- ship one solid stage first
- postpone boss-wave complexity and obstacle systems

## Recommended First Playable Deliverable

The first deliverable in `defense-game` should be:

- one playable stage
- four towers
- three regular enemy types plus one elite
- touch-first build, upgrade, sell, and pause flow
- title and result overlays
- placeholder art and audio acceptable

That version would already prove the reference tower defense loop works as a WeChat minigame.

## Conclusion

The reference tower defense design is a strong fit for a WeChat minigame, but it should be rebuilt as a cleaner, touch-first, canvas-only experience.

The best first step is:

1. keep one polished stage
2. keep the four tower identities
3. simplify secondary systems
4. prioritize readability and tap accuracy over feature count

That will give `defense-game` a stable foundation before expanding into more maps, more waves, boss behavior, obstacles, or leaderboard features.
