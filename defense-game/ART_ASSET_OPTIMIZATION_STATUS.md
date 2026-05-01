# Art Asset Optimization Status

Last updated: `2026-04-29`

This document tracks the current state of art-resource migration for `defense-game`, what has already been replaced with source art from `demo_towerDefense_hajimi`, and what still remains to be improved.

## Goal

The current direction is:

1. migrate original reference art whenever possible
2. compress and downscale assets before giving up on them
3. use code-drawn placeholders only where no matching source asset exists

The target is not a full Phaser-to-WeChat visual clone, but a WeChat-minigame version that preserves the original game's visual language as much as possible.

## Current Asset Inventory

Current imported art resources live in:

- [images](./images)
- [fonts](./fonts)

Current footprint:

- `images/`: about `2.0M`
- `fonts/`: about `68K`
- whole `defense-game/`: about `2.9M`

Imported image count:

- `37` files

## Completed

### 1. Asset Loading Pipeline

The empty asset stub has already been replaced with a real image manifest and preload pipeline:

- [src/assets.js](./src/assets.js)

Current manifest includes:

- `livingRoomBg`
- `titleBg`
- `towerSlot`
- `defenseTarget`
- `spawnDoor`
- `obstacleBox`
- `obstacleShoe`
- `catTabby`
- `catSiamese`
- `catFat`
- `catCalico`
- `enemyDust`
- `enemyCucumber`
- `enemyVacuum`
- `enemyMailman2`
- `enemyMailman3`
- `enemyMailman4`
- `enemyMailman5`
- `enemyPirate`
- `enemyKnight`
- `enemySpaceman`
- `enemyWizard`
- `enemyWildman`
- `enemyWarrior`
- `enemyNinja`
- `enemyWildwoman`
- `enemyIronman`
- `enemyShooter`
- `enemyMailman`
- `projMung`
- `projBone`
- `projBun`
- `projBoba`
- `iconKibble`
- `iconTowerTabby`
- `iconTowerSiamese`
- `iconTowerFat`
- `iconTowerCalico`

### 2. Reference Font Migration

The UI font has already been switched to the reference project font:

- [fonts/supercell-magic.ttf](./fonts/supercell-magic.ttf)
- [src/font.js](./src/font.js)

It is already used through:

- [src/utils.js](./src/utils.js)
- [src/minigame-app.js](./src/minigame-app.js)

This means the title screen, HUD, pause overlay, and result overlay are already using a shared visual text style closer to the reference game.

### 3. Battlefield Core Art Migration

The main combat-layer visuals have already moved away from hand-drawn placeholders and now prefer original source art:

- background underlay:
  - `living_room_bg.png`
- tower slots:
  - `tower_slot.png`
- spawn marker:
  - `spawn_door.png`
- defend target:
  - `defense_target.png`
- towers:
  - `cat_tabby.png`
  - `cat_siamese.png`
  - `cat_fat.png`
  - `cat_calico.png`
- enemies:
  - `enemy_dust.png`
  - `enemy_cucumber.png`
  - `enemy_vacuum.png`
  - `enemy_mailman2.png`
  - `enemy_mailman3.png`
  - `enemy_mailman4.png`
  - `enemy_mailman5.png`
  - `enemy_pirate.png`
  - `enemy_knight.png`
  - `enemy_spaceman.png`
  - `enemy_wizard.png`
  - `enemy_wildman.png`
  - `enemy_warrior.png`
  - `enemy_ninja.png`
  - `enemy_wildwoman.png`
  - `enemy_ironman.png`
  - `enemy_shooter.png`
  - `enemy_mailman.png`
- projectiles:
  - `proj_mung.png`
  - `proj_bone.png`
  - `proj_bun.png`
  - `proj_boba.png`

Relevant render entry points:

- [drawStageUnderlay](./src/minigame-runtime.js)
- [drawSpawnMarker](./src/minigame-runtime.js)
- [drawTarget](./src/minigame-runtime.js)
- [drawSlot](./src/minigame-runtime.js)
- [drawTower](./src/minigame-runtime.js)
- [drawEnemy](./src/minigame-runtime.js)
- [drawProjectile](./src/minigame-runtime.js)

### 4. Expanded Enemy Portrait Integration

The stage roster no longer depends on temporary generated enemy portraits.

What changed:

- the temporary `enemy_toaster.png` and `enemy_mixer.png` placeholders were removed
- all new character enemies were integrated through the asset manifest
- newly added enemy portraits were compressed to `160x160` to stay within WeChat minigame package limits

This keeps the enemy presentation more stylistically consistent while still preserving the older household-chaos enemies that are already part of the game identity.

### 5. Decorative Stage Props

Additional source props have been migrated and compressed:

- `obstacle_box.png`
- `obstacle_shoe.png`

These are already used as stage decoration through:

- [drawStageDecor](./src/minigame-runtime.js)

### 6. Title / Pause / Result Visual Unification

The following screens are no longer just plain code-drawn boxes:

- title screen
- pause overlay
- result overlay

What has already been added:

- panel texture overlays
- icon-based badge headers
- reference-style font
- source icons embedded into metrics and buttons

Relevant entry points:

- [renderTitle](./src/minigame-runtime.js)
- [renderPauseOverlay](./src/minigame-runtime.js)
- [renderResultOverlay](./src/minigame-runtime.js)
- [drawPanelTexture](./src/minigame-runtime.js)
- [drawBadgePill](./src/minigame-runtime.js)
- [drawPrimaryButton](./src/minigame-runtime.js)
- [drawSecondaryButton](./src/minigame-runtime.js)

### 7. Bottom HUD Migration Progress

The gameplay HUD has also started moving toward the source game's modular UI feel:

- top HUD now uses texture overlays
- bottom bar now has separated sections
- tower bar and wave area now use badge titles
- build buttons already use migrated tower icons
- wave button already uses migrated spawn icon

Relevant functions:

- [getHudSectionRects](./src/minigame-runtime.js)
- [renderGameplayHud](./src/minigame-runtime.js)
- [drawBuildButton](./src/minigame-runtime.js)
- [drawMetricCard](./src/minigame-runtime.js)

## Partially Completed

### 1. Kitchen Stage Theme

`厨房回旋` is more aligned with the reference style than before, but it is still only partially complete.

Current state:

- it reuses `living_room_bg.png`
- it uses cooler tinting and layout differences
- it adds original obstacle props
- it reuses `defense_target.png` with a cold-tone `冰箱` label treatment

This is a good intermediate solution, but it is still not a true kitchen-native source-art scene.

### 2. UI Containers

The current pause/result/title panels are closer to the reference game, but they are still mostly:

- code-drawn rounded panels
- code-drawn strokes
- texture overlays
- source icons layered on top

This is intentional, because the reference project does not actually provide pause/result/container sprite sheets that can be directly reused.

## Not Yet Completed

### 1. True Second-Stage Background

There is still no dedicated original-style kitchen background image.

Current status:

- `厨房回旋` reuses the living-room background texture
- stage differentiation is driven by:
  - path layout
  - color theme
  - target label treatment
  - decorative props

What is still missing:

- a real kitchen-specific background art treatment

### 2. Kitchen Target Asset

The kitchen objective still does not have its own true source-art sprite.

Current workaround:

- reuse `defense_target.png`
- add a cold fridge-style label treatment

What is still missing:

- a dedicated fridge-like objective sprite that matches the reference game's rendered asset language

### 3. Fully Asset-Based UI Containers

The project still does not have:

- title panel texture sprites
- pause modal sprites
- result modal sprites
- decorative border sprites for UI cards

This is partly because the reference project itself does not ship those assets in a reusable form.

If higher fidelity is needed later, this must be solved by:

- deriving more reusable UI textures from the source project
- or authoring matching companion assets

### 4. Non-Core Overlays Still Drawn in Code

The following are still primarily code-drawn:

- path line
- path arrows
- selected range rings
- warning chips
- hit / pressure feedback marks
- some panel separators and accent lines

This is acceptable for now, because these elements are functional overlays rather than character art, but they are still part of the remaining visual gap.

## Recommended Next Steps

### Highest Priority

1. create or derive a kitchen-specific background that still matches the source art language
2. replace the kitchen target workaround with a dedicated fridge-style objective asset
3. continue refining the selected-tower info panel so it feels more like a source-style information card

### Medium Priority

1. make title stage cards look more like collectible stage cards instead of enhanced list blocks
2. further refine the bottom build bar into a stronger source-style module layout
3. add more subtle source-style icon usage to warnings and utility controls

### Low Priority

1. reduce remaining code-drawn decorative elements where the gain is mostly cosmetic
2. revisit battlefield helper overlays after gameplay balance stabilizes

## Practical Rule Going Forward

When working on future art improvements for `defense-game`, use this rule:

- use original source PNGs first
- compress/downscale them second
- only keep code-drawn placeholders where no matching reference asset exists

That keeps the project aligned with the current visual goal without losing package-size control.
