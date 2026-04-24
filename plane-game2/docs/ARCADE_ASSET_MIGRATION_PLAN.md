# Arcade Asset Migration Plan

Checked on: 2026-04-24

This document records the migration plan for `plane-game2`.

The goal is to turn `plane-game2` into a sprite-driven WeChat minigame variant with a consistent arcade visual style, music, sound effects, and selected gameplay behaviors without attempting a direct engine-to-engine code port.

## Scope

The current arcade direction includes:

- sprite assets for player, enemies, bullets, explosions, buttons, title art, and backgrounds
- a packaged UI font (`Marker Felt.ttf`)
- packaged sound effects and background music
- a simpler arcade ruleset centered on:
  - auto-fire
  - drag movement
  - bomb usage
  - super-gun / stronger firepower pickup
  - three enemy classes

For `plane-game2`, the plan is to:

- reuse the current sprite-first presentation directly where it fits the WeChat minigame runtime
- selectively adapt gameplay behavior into the existing JavaScript runtime
- avoid copying engine-specific structure one-to-one

## Design Decision

`plane-game2` should be treated as a separate arcade-style branch in this repository.

This is the most reasonable direction because:

- `plane-game` already serves as the sketch-style minigame variant
- this arcade-style direction is visually and structurally different from the sketch-style build
- mixing both styles into one runtime would weaken both directions

## Implementation Strategy

The work is split into three stages.

### Stage 1: Presentation Migration

Goal:

- replace the sketch-first presentation with sprite-first rendering

Main items:

- background image
- cover title image
- player plane sprites
- small / medium / large enemy sprites
- player and enemy bullets
- explosion frame sequences
- basic supply-drop sprites
- arcade BGM and sound effects
- arcade button art and panel accents where reasonable

Status:

- completed in the first migration pass

### Stage 2: Core Gameplay Alignment

Goal:

- move the game feel closer to the target arcade rules without destabilizing the current minigame runtime

Main items:

- refine double-shot and stronger-firepower timing
- align enemy destruction audio to enemy class
- improve large-enemy entry pressure and matching audio
- decide whether player survivability should remain one-hit death or move toward an HP model
- simplify the power-up set toward a more focused structure

Status:

- substantially implemented in the second migration pass

### Stage 3: Full Ruleset Decision

Goal:

- decide whether `plane-game2` should remain a fast arcade minigame with the current survival model, or fully adopt the heavier HP-based player rules

Possible directions:

- keep the current one-hit-fail loop and only absorb style, audio, and selected pickup behavior
- move to a fuller HP, damage, and invincibility model

Recommendation:

- keep the lighter `HP = 3` adaptation for now
- continue validating whether the lighter HP model preserves the minigame pace better than a heavier survivability model

## First Migration Pass

The following items are already implemented:

- arcade visual assets copied into `plane-game2/images/`
- arcade audio copied into `plane-game2/audio/`
- runtime asset loading updated for sprite-based rendering
- sprite-based player plane rendering
- sprite-based enemy rendering for small, medium, and large enemies
- sprite-based explosion sequences for player and enemy destruction
- packaged background, loading art, title art, game-over art, and button art
- packaged BGM and sound effects mapped into the audio runtime
- packaged `Marker Felt` font copied into the minigame package and used for shared canvas text rendering with fallback handling
- first-pass pickup mapping centered on:
  - `Double Shot`
  - `Firepower Upgrade`
  - `Bomb`

## Current Parity Audit

`plane-game2` is not yet a full one-to-one arcade port.

Current assessment:

- the sprite-first presentation layer is largely recreated
- the core arcade loop is recreated and playable
- several gameplay systems are intentionally adapted for the WeChat minigame runtime rather than copied exactly
- a few target-rule behaviors are still different enough that the project should be described as a close adaptation, not a full parity port

### Feature Matrix

#### Recreated or Functionally Matched

- sprite-driven presentation for player, enemies, bullets, explosions, title art, background, game-over art, and button assets
- arcade BGM and main sound-effect set
- `Marker Felt` UI font applied to canvas-drawn text with fallback handling
- drag-to-move player control with automatic firing
- three visible enemy classes
- best-score persistence
- pause and resume flow
- game-over presentation and restart flow
- bomb pickup, bomb inventory, and full-screen bomb clearing
- stronger-firepower pickup and short-duration upgraded shooting
- player HP, post-hit invincibility, and blink feedback

#### Adapted Rather Than Matched One-to-One

- player survivability uses `HP = 3` in `plane-game2`, while the heavier arcade target uses a larger HP pool
- the target ruleset switches between separate gun states; `plane-game2` recreates the effect through bullet-pattern logic instead of object-level gun toggles
- the target ruleset uses fixed repeating spawn timers for enemies and awards; `plane-game2` replaces that with survival-based pacing, queued waves, and richer formations
- the target ruleset uses double-click bomb triggering; `plane-game2` uses a dedicated lower-left bomb button, which is more readable on touch screens
- the target ruleset has a simple local UI stack; `plane-game2` keeps the local flow but adapts it into a full-canvas minigame overlay system

#### Not Recreated as Target Behavior

- a separate start-menu scene and menu-controller flow are not reproduced; `plane-game2` uses a single-canvas cover screen instead
- a true application quit action is not reproduced, because it is not meaningful in the WeChat minigame runtime
- the exact target spawn cadence for `enemy0 / enemy1 / enemy2 / award1 / award2` has not been mirrored one-to-one
- the exact target HP, bomb, and weapon tuning values have not been ported numerically one-to-one

#### Beyond the Baseline Ruleset

- enemy bullet patterns, large-enemy phase changes, and attack telegraphs
- friend leaderboard rendering through open data context
- local run leaderboard history
- share-based revive flow
- richer wave composition and survival-based difficulty scaling

### Practical Conclusion

If the target is:

- "does `plane-game2` already capture the current arcade build's main look, audio, and playable identity?"
  Answer: yes, mostly.
- "has `plane-game2` already recreated every target feature exactly?"
  Answer: no.

The project is currently best described as:

- a high-parity arcade adaptation with several deliberate minigame-specific improvements
- not a strict feature-for-feature port

## Risks and Constraints

### 1. Asset Rights

Before public distribution, confirm that all bundled images, sounds, and font-related assets are licensed for release use.

### 2. Package Limits

The project still follows the local per-file validation budget used across this repository.

Current note:

- the inactive legacy media identified during migration has now been physically removed from the arcade branch

Recommended action:

- keep watching for newly orphaned files whenever the active runtime asset set changes

### 3. Gameplay Consistency

The current arcade target is simpler than the current `plane-game2` runtime in some areas and more structured in others.

Examples:

- the arcade ruleset uses a focused power-up set
- the arcade ruleset has a clearer enemy-class presentation
- the arcade player model includes HP and temporary invincibility

This means selective adaptation is safer than blind feature copying.

## Next-Step Execution Plan

The next phase should be executed in this order.

### Step 1: Player Survivability Model

Decision:

- prototype a lightweight HP system with temporary invincibility and hit flash

Reason:

- this is the biggest gameplay difference from the current arcade target
- it affects collision, UI, audio, revive behavior, and balance

Recommended implementation boundary:

- start with `HP = 3`
- add short hit invincibility
- keep existing drag movement and auto-fire untouched

Acceptance signals:

- getting hit feels readable
- the game remains fair on mobile
- revive and game-over states stay coherent

Current status:

- implemented in the second migration pass

### Step 2: Weapon and Pickup Timing

Decision:

- tighten the pickup set around `Double Shot`, `Firepower Upgrade`, and `Bomb`

Reason:

- the current sprite presentation already supports this direction well
- it reduces system noise and better matches the arcade target

Recommended implementation boundary:

- keep the runtime centered on `Double Shot`, `Firepower Upgrade`, and `Bomb`
- remove secondary utility pickups that are not part of the current arcade identity

Acceptance signals:

- pickups are easy to understand at a glance
- the power curve feels closer to the target arcade shooter

Current status:

- implemented with a `3s` double-shot window, a faster upgraded fire rhythm, and a narrowed pickup set focused on `Double Shot`, `Firepower Upgrade`, and `Bomb`

### Step 3: UI and Overlay Unification

Decision:

- continue replacing sketch-style overlays with matching arcade-style UI

Reason:

- the runtime is now mixed: gameplay is more sprite-driven, but some overlays still carry the previous sketch-style language

Recommended implementation boundary:

- pause overlay
- leaderboard panel styling
- lower-left inventory styling
- HUD score cards

Current status:

- implemented for pause, game-over, and leaderboard overlays
- further polish is still possible for the HUD cards and inventory capsule styling

Acceptance signals:

- the game no longer feels like two visual systems stitched together

### Step 4: Cleanup and Packaging

Decision:

- remove or ignore legacy assets that are no longer part of the active `plane-game2` runtime

Reason:

- keeps the upload package smaller
- reduces audit risk
- makes the project easier to maintain

Acceptance signals:

- validation passes cleanly
- no stale assets remain in the active runtime path

Current status:

- implemented by deleting the inactive legacy audio and image files that no longer belonged to the active arcade runtime

## Recommended Next Task

The most valuable next implementation task is:

- run a focused real-device verification pass for the trimmed arcade ruleset and packaged asset set
- then decide whether the remaining reference-only differences should be preserved as minigame-specific improvements or closed for stricter one-to-one parity

This is the correct next step because the survivability model, double-shot rhythm, overlay unification, focused pickup identity, and repository/package cleanup are now in place. The next gain will come from verifying that the cleaned build still feels correct in WeChat DevTools and on a real device, and then choosing whether to keep or close the remaining parity gaps around HP tuning, bomb input style, and fixed spawn cadence.
