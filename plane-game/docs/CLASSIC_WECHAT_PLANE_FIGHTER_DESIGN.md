# Classic WeChat Plane Fighter Design Notes

This document summarizes the core design ideas behind the original WeChat plane shooter that became widely known with WeChat 5.0 in 2013. The goal is not to recreate every historical system detail one-to-one, but to preserve the gameplay logic that made the original release memorable and highly replayable.

## Why This Matters

The original game looked simple, but it combined classic arcade shooter rules with mobile-first interaction and WeChat-native social hooks. That combination made it easy to start, easy to understand, and hard to stop playing.

For this repository, the original game is a useful reference for:

- input feel
- session pacing
- risk and reward balance
- power-up design
- leaderboard and sharing loops
- nostalgic visual direction

## Core Gameplay Loop

The original design can be reduced to a short loop:

1. Drag the plane directly with one finger.
2. Let the plane fire automatically.
3. Dodge incoming enemies and bullets.
4. Pick up supply drops to create short power spikes.
5. Stay alive as the game accelerates.
6. Compare the final score with friends.

This loop removes unnecessary friction. The player does not need to learn multiple buttons, aim manually, or manage complex stats. Almost all attention stays on positioning and survival.

## Input Model

The most important control rule is direct finger tracking.

- The plane should follow the player’s finger immediately.
- Movement should feel one-to-one rather than inertial.
- The control system should avoid input lag, acceleration curves, or drag resistance.

This is a major part of the game’s appeal. The player feels fully responsible for both survival and mistakes because the plane reacts as quickly as the finger moves.

## Combat Model

The combat rules are intentionally minimal.

- Shooting is automatic and continuous.
- The player only needs to think about movement, spacing, and timing.
- Contact with an enemy or hostile bullet ends the run immediately.

The instant-fail rule creates sharp tension. Because the punishment is high, the control model must stay extremely responsive and visually readable.

## Difficulty and Scoring

The original game builds pressure through survival time rather than through a complex stage structure.

- Enemies enter from the top and move downward.
- Spawn frequency increases over time.
- Enemy speed also increases over time.
- Longer survival means more screen pressure and less recovery space.

The scoring model reinforces target priority.

- Small enemies give a low score.
- Medium enemies give a meaningful score bump.
- Large enemies give the highest score and often justify extra risk.

This creates a simple but effective decision layer: play safe for survival, or take calculated risks for score.

## Power-Up Design

Supply drops are central to the original game’s rhythm.

- Power-ups arrive as falling supply items that the player must actively collect.
- The player must briefly shift from pure dodging to route planning.
- A pickup creates a short, high-energy phase inside an otherwise minimalist loop.

The best-known power-ups are:

- `Double Shot`: temporarily upgrades firepower from single-shot to dual-shot.
- `Bomb`: clears the entire screen and acts as an emergency escape tool.

These tools do more than increase damage. They create spikes of relief, aggression, and tactical choice.

## Advanced Risk and Reward

One of the interesting traits of the original game is that skilled play is not purely defensive.

- Strong runs are not built only on dodging.
- Players are rewarded for staying aggressive when the situation allows it.
- Close-range play around large enemies can improve kill speed and score efficiency.

That creates a more expressive skill ceiling than a purely reactive dodging game.

## Social and System Design

The original WeChat release became much bigger than a standalone shooter because it used WeChat’s social graph directly.

- Friend leaderboards made every run comparable.
- Sharing scores created lightweight bragging loops.
- Asking friends for more plays encouraged viral spread.
- Automatic exposure during the WeChat 5.0 rollout drove immediate adoption.

This is an important product lesson: the core shooter loop was strong, but the social wrapper turned it into a mass-behavior product.

## Visual Direction

The original visual identity is as important as the mechanics.

- The game used a pencil sketch style with grayscale tones.
- Planes, bullets, and effects looked hand-drawn rather than polished or flashy.
- The presentation felt nostalgic, plain, and intentionally low-tech.

This style helped the game feel approachable and memorable. It also reduced visual noise, which supported fast mobile gameplay.

## Product Principles Worth Keeping

When adapting the classic design to modern implementations, these principles are the most important to preserve:

- Keep control immediate and predictable.
- Keep combat readable and low-friction.
- Make every death feel fair.
- Use power-ups to create short bursts of excitement.
- Let score chasing drive replayability.
- Support social comparison whenever platform capabilities allow it.
- Prefer clarity and mood over flashy visual overload.

## Implications for `plane-game`

The current `plane-game` project already follows part of this formula:

- drag-to-move control
- automatic shooting
- escalating enemy pressure
- score tracking
- short-session arcade structure

If we want to move the project closer to the original WeChat design, the highest-value additions are:

- bomb supply drops
- parachute-style supply presentation
- clearer enemy classes with score tiers
- stronger score-risk balance for larger enemies
- friend ranking or leaderboard integration if backend or platform support is added
- continued refinement of the pencil sketch interface and feedback layer

## Power-Up Expansion for `plane-game`

The current project started with only two visible supply rewards:

- `Double Shot`
- `Bomb`

That is enough for a basic arcade loop, but it is too narrow for longer sessions. To improve pacing without making the rules heavy, the preferred direction is to add short-duration or instantly readable power-ups that create tactical spikes.

### Current Implemented Priority Order

#### Priority 1: Immediate Survival and Score Clarity

- `Screen Clear`
  Effect: stores one manual-use charge that clears all hostile bullets when triggered by the player.
  Reason: gives the player a fast defensive answer without replacing the stronger full bomb.
  Status: implemented.

- `Slow Time`
  Effect: temporarily slows enemies and hostile bullets.
  Reason: gives breathing room during dense waves and makes difficult patterns feel fairer.
  Status: implemented.

- `Score Boost`
  Effect: temporarily multiplies score gains.
  Reason: strengthens score chasing and makes risky windows feel more rewarding.
  Status: implemented.

#### Priority 2: Broader Combat Expression

- `Shield Supply`
  Effect: grants a temporary shield that can absorb one hit.
  Reason: the logic already exists and fits the arcade loop when supplied sparingly.
  Status: implemented as a collectible drop.

- `Firepower Upgrade`
  Effect: upgrades the current weapon beyond the basic dual shot for a short burst, using a stronger three-lane straight-fire pattern.
  Reason: creates a stronger offensive peak than standard double-shot.
  Status: implemented.

### Implementation Notes

The preferred implementation rules are:

- keep supply effects short and easy to read
- avoid stacking too many simultaneous buffs
- preserve one-hand readability and the instant-fail core loop
- let HUD badges show only the most important active timed effects
- favor effects that create clear bursts of relief, aggression, or scoring pressure
- prefer silhouette and color recognition over tiny text on fast-moving supply drops

### Current Implemented Supply Set

The active build now supports:

- `Double Shot`
- `Bomb`
- `Shield`
- `Screen Clear`
- `Slow Time`
- `Score Boost`
- `Firepower Upgrade`

Implementation detail for the current build:

- `Bomb` is now delivered through an independent falling supply rhythm instead of enemy-death drops.
- `Firepower Upgrade` lasts 10 seconds and temporarily switches the player into a faster three-lane straight-fire burst.
- Share revive intentionally preserves carried bombs and can be used up to three times per run because it continues the same run rather than starting a fresh session.
- Supply-drop rendering now prioritizes palette separation and enlarged icons; labels are hidden when the pickup size would make them unreadable.
- The lower-left defensive inventory has been simplified into compact item-count capsules to reduce HUD footprint during play.

## Practical Takeaway

The original WeChat plane shooter succeeded because it combined three things extremely well:

- one-hand touch control that felt instant
- classic automatic-shooting arcade tension
- social comparison that made every score matter

That combination is the design baseline this project should use when deciding what to simplify, what to add, and what to avoid.
