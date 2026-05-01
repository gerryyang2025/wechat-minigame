# Enemy Attack System Design

## Status Note

This document started as the design proposal for the enemy-attack combat expansion of `defense-game`.

The current runtime now includes the Phase 1 baseline from this plan:

- enemy attack state handling
- tower durability, break, and repair flow
- tower status effects
- reusable enemy projectile and skill resolution
- shared sixteen-wave progression with numeric difficulty scaling

The rest of this document should now be read as:

- the reference design that shaped the current implementation
- a checklist for follow-up tuning and deeper skill polish
- the guardrails for keeping future changes aligned with the current canvas-only WeChat minigame architecture

## Why This System Is Needed

The current game already has:

- enemy movement pressure
- sprint, armor, enrage, and summon behaviors
- stage-based wave progression
- clear tower roles

What it does **not** have yet is enemy-side combat pressure on the defense line itself.

At the moment enemies mostly threaten the player in one way:

- they leak through the path
- they reach the defend target
- they remove lives

That loop is readable, but it limits how much the player can express defense decisions beyond:

- raw damage
- slow coverage
- focus fire

Adding enemy attack abilities will improve the game by:

- making tower placement more meaningful
- making front line and back line decisions more distinct
- giving elite and boss enemies stronger identities
- creating moments where protecting key towers matters as much as protecting the final target

## Design Goals

The recommended design should:

- keep the game touch-first and readable on a phone
- preserve the existing cute tower-defense identity
- give each enemy role an offensive personality
- increase pressure without turning the game into a full RTS combat sim
- keep wave scripts shared across `easy`, `normal`, and `hard`
- make difficulty differences mainly numeric, consistent with the current direction
- avoid overly punishing permanent tower loss

## Non-Goals

This system should **not** try to become:

- free-form enemy pathfinding around the map
- fully simulated enemy-vs-tower melee combat everywhere on the field
- an action game with manual hero skills
- a permanent tower deletion system with no recovery path

## Current Runtime Constraints

The current combat loop in `src/minigame-runtime.js` is built around:

- wave spawning
- enemy path movement
- tower target acquisition
- tower projectile resolution
- enemy damage, armor break, sprint, and enrage

This architecture is a good base, but it suggests a practical extension strategy:

1. keep enemy movement path-based
2. add a lightweight enemy attack state machine
3. add tower durability and tower status effects
4. add a separate enemy projectile track instead of overloading tower projectiles immediately

That approach minimizes risk and fits the current minigame runtime better than a full combat rewrite.

## Recommended Core Combat Expansion

### 1. Tower Durability

Towers should gain a new durability layer so enemy attacks have a meaningful target.

Recommended new tower runtime fields:

- `maxDurability`
- `durability`
- `isBroken`
- `brokenUntil`
- `statusEffects`
- `repairCost`

Suggested starting values:

- `tabby`: 120 durability
- `siamese`: 95 durability
- `chonky`: 160 durability
- `boba`: 105 durability

Suggested upgrade bonuses:

- level 2: `+20%` max durability
- level 3: `+40%` max durability

### 2. Broken State Instead of Permanent Deletion

Enemy attacks should pressure the player, but permanent tower deletion is too punishing for a touch-first minigame.

Recommended behavior:

- when tower durability reaches `0`, the tower enters `broken`
- broken towers cannot attack
- broken towers visually dim and show a repair badge
- after `3.5s` to `4.5s`, the tower auto-recovers to `35%` durability
- the player can manually repair a broken or damaged tower for gold

Recommended repair rule:

- repair button appears only when tower durability is below `100%`
- repair cost equals `20%` to `30%` of tower base cost
- repairing restores to full durability instantly

This keeps the system tense without creating a snowball spiral.

### 3. Tower Status Effects

Not every enemy attack should be raw durability damage.

Recommended shared status set:

- `jammed`: tower cannot fire
- `suppressed`: tower cooldown recovery slows down
- `blinded`: tower range is reduced
- `marked`: tower takes extra durability damage from enemy attacks

Suggested phase-one math:

- `jammed`: `1.0s` to `1.6s`
- `suppressed`: `fireRate * 0.72` for `2.0s`
- `blinded`: `range * 0.8` for `2.5s`
- `marked`: `+25%` incoming enemy attack damage for `3.0s`

These four effects are enough to create role identity without overloading readability.

## Enemy Attack Model

### Enemy Priority Rule

Enemies should still prioritize the final objective.

Recommended priority order:

1. continue pathing by default
2. if a valid tower enters the enemy's engagement corridor, decide whether to attack
3. if no valid tower exists, resume movement immediately
4. only a small set of ranged elites and bosses may attack the final target before contact

This keeps the existing defense fantasy intact.

### Engagement Corridor

Enemies should not attack towers anywhere on the map.

Recommended constraint:

- each enemy can only target towers within an `engagementRadius`
- that radius is checked from the enemy center
- tower targeting should prefer towers close to the current path segment

Suggested values:

- light melee enemies: `56` to `72`
- ranged harass enemies: `96` to `132`
- elites and bosses: `110` to `160`

This preserves deterministic path pressure and avoids chaotic off-screen interactions.

### Enemy Attack State Machine

Recommended enemy state flow:

```text
moving
  -> windup
  -> attacking / casting
  -> recovery
  -> moving
```

Recommended new runtime fields on enemies:

- `attackRange`
- `engagementRadius`
- `attackCooldownMs`
- `attackWindupMs`
- `attackRecoveryMs`
- `attackDamage`
- `attackTargetMode`
- `attackState`
- `attackStateUntil`
- `skillCooldownMs`
- `activeStatuses`

### Projectile Strategy

The safest technical path is to keep enemy projectiles separate from tower projectiles in phase one.

Recommended runtime addition:

- `enemyProjectiles = []`

Reason:

- current tower projectile logic assumes enemy targets
- enemy attacks will need tower targets, target-objective shots, and debuff payloads
- keeping a separate list reduces regression risk

Recommended enemy projectile fields:

- `kind`
- `x`, `y`
- `speed`
- `sourceEnemyId`
- `targetTowerId` or `targetObjective`
- `damage`
- `statusPayload`
- `splashRadius`
- `lifetime`

### Reusable Attack Modules

To keep the roster scalable, enemy attacks should be built from a small number of reusable modules.

Recommended module set:

### 1. `meleeStrike`

- short range
- single-target tower damage
- optional small status effect

### 2. `rangedShot`

- medium or long range
- direct tower-target projectile
- good for harass roles

### 3. `burstVolley`

- 2 to 3 quick shots
- low per-hit damage
- high suppression pressure

### 4. `areaLob`

- lobbed projectile
- small splash around target tower
- best for pirate, boss, and siege roles

### 5. `controlCast`

- low direct damage
- strong status application
- best for wizard, black-hat boss, and utility elites

### 6. `pressureAura`

- short-radius pulse
- used by vacuum-like or siege roles
- affects multiple nearby towers

### 7. `objectiveBlast`

- rare
- only for select ranged elites and bosses near the end of the route
- adds direct target pressure without waiting for a full leak

## Enemy Role Skill Map

The roster should keep one clear offensive identity per role.

Existing passives such as sprint, armor, enrage, and summon remain active; the new attack skill layer is additive.

| Enemy | Basic attack | Signature skill | Intended pressure |
| --- | --- | --- | --- |
| `dust` | `meleeStrike` nibble | `Dust Puff`: on contact or defeat, applies short `blinded` to the nearest tower | early nuisance, teaches tower status |
| `mailman2` | `rangedShot` parcel toss | `Misdelivery`: small hit plus extra tower cooldown delay | early ranged harassment |
| `wildman` | `meleeStrike` club smash | `Rage Pound`: heavy second hit against the same tower | teaches front-line protection |
| `cucumber` | `meleeStrike` quick slap during sprint windows | `Peel Trip`: sprint hit applies `suppressed` | ties new attack system to existing sprint identity |
| `wildwoman` | `rangedShot` hunting knife | `Hunter Mark`: marks a tower for bonus incoming enemy damage | focus-fire setup role |
| `pirate` | `rangedShot` pistol poke | `Powder Bomb`: small `areaLob` against clustered towers | punishes overstacked tower layouts |
| `ninja` | `burstVolley` shuriken | `Smoke Cut`: backline dash + short `jammed` on a priority tower | backline disruption |
| `shooter` | `rangedShot` rifle fire | `Suppressing Fire`: three-shot volley that extends cooldowns | sustained ranged control |
| `vacuum` | `meleeStrike` body ram | `Suction Pulse`: short-radius `pressureAura` that applies `blinded` or `suppressed` | anti-range bruiser |
| `knight` | `meleeStrike` shield bash | `Guard Crush`: hit plus brief `jammed` | armored tower breaker |
| `warrior` | `meleeStrike` cleave | `Sweeping Slash`: damages the target tower and one nearby tower | anti-cluster melee elite |
| `spaceman` | `rangedShot` ion bolt | `Jet Beam`: ranged ion burst that applies `suppressed`, can pressure the objective in late-route range | mobile elite pressure |
| `wizard` | `controlCast` arcane bolt | `Hex Field`: `blinded` + `suppressed`, with existing summon/enrage synergy | utility elite controller |
| `ironman` | `meleeStrike` heavy gauntlet hit | `Overload Salvo`: slow `areaLob` with high durability damage | siege bruiser |
| `mailman` | `rangedShot` parcel smash | `Package Bomb`: lobbed blast on tower clusters, plus existing enrage summon | first boss pressure spike |
| `mailman3` | `rangedShot` command parcel | `Focus Order`: marks the highest-value tower and buffs nearby enemies to target it | boss that coordinates pressure |
| `mailman4` | `controlCast` dark parcel | `Blackout Hack`: long `jammed` on one tower and short `blinded` pulse on nearby towers | disruption boss |
| `mailman5` | `rangedShot` heavy delivery cannon | `Final Dispatch`: rotates bomb, EMP, and elite-call skills by phase | final boss showcase |

## Recommended Targeting Rules Per Role

To make enemy attacks readable, target selection should be role-based rather than fully dynamic.

Recommended target preferences:

- basic melee units: nearest tower in corridor
- ranged harass units: highest-progress tower lane or nearest tower
- debuff casters: highest-level tower in range
- anti-cluster units: tower with at least one nearby ally tower
- bosses: scripted priorities plus fallback to nearest tower

This gives players learnable patterns.

## Wave Progression With Enemy Attacks

The new system should reinforce the existing sixteen-wave arc instead of replacing it.

Recommended pressure curve:

- waves `0-3`: light tower harassment only
- waves `4-7`: first meaningful tower damage and simple disable effects
- waves `8-11`: elites combine tower damage with control
- waves `12-15`: bosses and elites create layered pressure on both towers and target

Recommended progression principle:

- early game teaches one status at a time
- mid game combines durability damage with one control effect
- late game introduces AoE and tower-priority pressure

## Difficulty Design

The game already uses the rule that all difficulties share the same wave script and differ mainly through numeric tuning.

The new enemy-attack system should follow the same rule.

### Shared Wave Principle

Keep these identical across difficulties:

- enemy order
- enemy role mix
- boss placements
- tower roster

### Numeric Difficulty Scaling

Add new difficulty fields such as:

- `enemyAttackDamageMultiplier`
- `enemyAttackCooldownMultiplier`
- `enemyStatusDurationMultiplier`
- `enemySkillWindupMultiplier`
- `towerRepairCostMultiplier`
- `towerAutoRecoverRatio`

Suggested first-pass values:

### Easy

- `enemyAttackDamageMultiplier: 0.88`
- `enemyAttackCooldownMultiplier: 1.1`
- `enemyStatusDurationMultiplier: 0.85`
- `enemySkillWindupMultiplier: 1.08`
- `towerRepairCostMultiplier: 0.8`
- `towerAutoRecoverRatio: 0.45`

### Normal

- `enemyAttackDamageMultiplier: 1`
- `enemyAttackCooldownMultiplier: 1`
- `enemyStatusDurationMultiplier: 1`
- `enemySkillWindupMultiplier: 1`
- `towerRepairCostMultiplier: 1`
- `towerAutoRecoverRatio: 0.35`

### Hard

- `enemyAttackDamageMultiplier: 1.16`
- `enemyAttackCooldownMultiplier: 0.9`
- `enemyStatusDurationMultiplier: 1.15`
- `enemySkillWindupMultiplier: 0.92`
- `towerRepairCostMultiplier: 1.15`
- `towerAutoRecoverRatio: 0.25`

This keeps the earlier design decision intact: difficulty is mostly numeric, not script-based.

## UI and Feedback Requirements

This system will only feel fair if it is easy to read.

Recommended UI additions:

- tower durability bar
- tower status icon or pill above the tower
- broken-tower badge
- repair button in the selected tower panel
- enemy windup ring before large attacks
- skill cue banner only the first time a new attack pattern appears in a wave

Recommended tower status labels:

- `禁射` for jammed
- `压制` for suppressed
- `减程` for blinded
- `破损` for broken

Recommended principle:

- small attacks use local effects only
- elite and boss skills may use `showHint` or `showBanner`
- never spam large banners for repeated low-tier attacks

## Technical Touch Points

If this design is approved, the main file impact should be:

### `src/content.js`

- add tower durability definitions
- add enemy `attackProfile`
- add enemy `skillProfile`
- add new difficulty multipliers for attack systems

### `src/minigame-runtime.js`

- add tower durability/status runtime fields
- add repair flow
- add enemy attack state machine
- add enemy projectile update and draw logic
- add tower-status rendering
- add boss-skill telegraph feedback

### `src/assets.js`

- optional new enemy projectile assets
- phase one can use procedural projectiles to control package size

### `README.md`

- document the feature plan and scope once implementation begins

## Recommended Implementation Phases

### Phase 1: Core Combat Framework

Ship the minimum system needed to prove the loop:

- tower durability
- broken state
- repair button
- shared tower status system
- separate enemy projectile pool
- attack-capable enemies: `mailman2`, `wildman`, `pirate`, `shooter`, `wizard`, `mailman`

Goal:

- verify that enemy attacks improve the loop without overwhelming the player

### Phase 2: Full Roster Conversion

Expand the system to the whole roster:

- add attack profiles to all enemies
- implement anti-cluster, anti-backline, and anti-range patterns
- convert boss skills into phase-based encounters

Goal:

- give each enemy a clear gameplay identity

### Phase 3: Polish and Balance

- refine visual telegraphs
- add any missing projectile assets or sound cues
- tune tower durability and repair economy
- adjust late-wave pressure so the system feels tense, not exhausting

Goal:

- keep the loop readable and fair on mobile

## Balance Risks To Watch

The biggest risks are:

- too much tower disable causing loss of agency
- permanent snowball if broken towers are too expensive to recover
- bosses stacking ranged tower damage with objective damage too often
- visual overload from too many simultaneous status badges

Recommended guardrails:

- never allow more than one hard-disable status on the same tower at once
- keep low-tier enemy tower damage modest
- reserve large AoE tower attacks for elites and bosses
- cap simultaneous boss banner frequency

## Final Recommendation

The best next-step design is:

1. add tower durability and recovery
2. add a reusable enemy attack framework
3. map each enemy role to one offensive identity
4. keep all difficulties on the same sixteen-wave script
5. scale attack pressure mostly through numbers, not different wave content

This approach is the best fit for the current `defense-game` codebase because it deepens the gameplay loop without requiring a full combat rewrite.
