# Friend Leaderboard Data Flow

This document explains how the friend leaderboard works in `plane-game2`.

## High-Level Meaning

The friend leaderboard is not rendered from local storage and it is not fetched from a custom backend.

It uses the WeChat minigame open data context flow:

1. The main domain writes the player's best score to WeChat cloud storage.
2. The main domain asks the open data context to render the friend leaderboard.
3. The open data context reads friend cloud storage data.
4. The open data context renders the list into `sharedCanvas`.
5. The main domain draws `sharedCanvas` inside the leaderboard panel.

This matches the in-game leaderboard path described by the WeChat official ranklist guide:

- `wx.setUserCloudStorage()` uploads the current player's score
- `wx.getFriendCloudStorage()` reads friend scores inside the open data context
- the open data context renders the result into `sharedCanvas`

Official reference:

- https://developers.weixin.qq.com/minigame/dev/guide/open-ability/ranklist.html

## Data Flow Diagram

```text
Main Domain Runtime
  -> wx.setUserCloudStorage()
  -> wx.getOpenDataContext()
  -> openDataContext.postMessage({ showFriendLeaderboard })

Open Data Context
  -> wx.getFriendCloudStorage()
  -> render friend records into sharedCanvas

Main Domain Runtime
  -> drawImage(sharedCanvas, ...)
```

## Storage Key

The current build stores the best score with this key:

- `plane_best_score`

The same key is used when:

- writing the player's own best score
- reading friend leaderboard values from cloud storage

## Hosted Data Limits

The current project stores only one hosted leaderboard key:

- `plane_best_score`

This means the project is far below the usual hosted-data limit for this feature.

The documented limits for `wx.setUserCloudStorage()` are:

- up to `128` key-value entries per user per game
- each `key + value` pair must stay within `1KB`
- each `key` must stay within `128` bytes

With the current design, the project only writes a single best-score string, so it does not approach the limit in normal use.

## How Writes Work

The current leaderboard flow overwrites the same key instead of appending new records.

That means:

- the best-score entry does not keep growing over time
- writing a new value for `plane_best_score` replaces the old one
- the project does not need manual cleanup during normal score updates

## Main Domain Responsibilities

The main domain runtime is responsible for:

- saving the player's best score to WeChat cloud storage
- opening the leaderboard overlay
- sending the friend leaderboard render request to the open data context
- drawing the returned `sharedCanvas` into the visible leaderboard panel
- falling back to the local device leaderboard if the open data context is unavailable

Relevant files:

- `src/minigame-runtime.js`
- `game.js`

Key runtime steps:

- `syncCloudLeaderboard()` writes `plane_best_score` with `wx.setUserCloudStorage()`
- startup now proactively syncs the locally stored best score when it is greater than `0`
- `openLeaderboard('friends')` proactively syncs the current best score, then switches the overlay into friend mode
- `postOpenDataMessage('showFriendLeaderboard', ...)` passes the layout size and score key to the subdomain
- `ctx.drawImage(this.sharedCanvas, ...)` paints the rendered friend list into the leaderboard panel

This means the current player's best score can still be refreshed in hosted data even when no friend records are available yet.

## Manual Cleanup

If you want to clear the hosted friend-leaderboard value for the current user, remove the key with:

```js
wx.removeUserCloudStorage({
  keyList: ['plane_best_score']
});
```

This removes only the current user's hosted value.

It does not remove data for other users.

## Resetting a Leaderboard Season

If you need a fresh leaderboard season or a clean migration, the safest approach is usually to switch to a new score key instead of trying to clear everyone else's hosted data.

Example:

- old key: `plane_best_score`
- new key: `plane_best_score_v2`

With that approach:

- old hosted data remains untouched
- the runtime starts reading and writing the new key
- the friend leaderboard effectively starts from a clean season

## Open Data Context Responsibilities

The open data context is responsible for:

- receiving the `showFriendLeaderboard` message
- reading friend data with `wx.getFriendCloudStorage()`
- sorting the returned records by score
- rendering the result into `sharedCanvas`
- showing loading, empty, or error states when needed

Relevant files:

- `openDataContext/index.js`

Key subdomain steps:

- `setCanvasSize(...)` sets the logical layout size, updates the shared-canvas backing size, and applies the internal render scale
- `loadFriendData()` calls `wx.getFriendCloudStorage()`
- `normalizeRecords(...)` extracts and sorts the cloud-storage values
- `render()` draws the current leaderboard state into the shared canvas

## Relationship To WeChat Ranklist Configuration

The official ranklist guide also covers a second layer beyond the in-game friend panel:

- WeChat Search ranking display
- social-component ranking display
- rank interaction notifications after the relevant subscription is enabled

Those surfaces do not become active from code alone. They additionally require:

1. uploading the score with the same hosted-data key
2. configuring the rank entry in the WeChat minigame admin console
3. passing WeChat review for that configuration

For `plane-game2`, the runtime already handles step `1` with:

- key: `plane_best_score`
- order: descending
- data type: integer score

The remaining admin-console configuration is still a manual publishing step outside this repository.

## Why a Friend Leaderboard Can Look Empty

An empty or error state does not always mean the UI is broken.

Common causes:

- the current environment does not support open data context APIs
- friend cloud storage has not been written yet
- no friend has a valid `plane_best_score`
- the user is testing in an environment where friend data is restricted

In those cases, the project still keeps the local device leaderboard available.

## Common Permission Error

If the leaderboard shows an error similar to:

- `getFriendCloudStorage: fail game appid no privacy api permission`

the usual cause is not missing friend scores. It means the current minigame AppID does not yet have the required privacy-interface permission in the WeChat backend.

Typical checks:

1. Log in to the WeChat minigame admin console with the same AppID used by the project.
2. Complete and publish the user privacy protection guide for the current version.
3. Rebuild or reopen the game in DevTools or on a real device, then retry the friend leaderboard.

In the current build, this case is shown as a dedicated permission error instead of being mixed with the empty-data state.

## Local Leaderboard vs Friend Leaderboard

- Local leaderboard:
  stored on the current device through local storage and available without open data context
- Friend leaderboard:
  read from WeChat cloud storage through the open data context and rendered through `sharedCanvas`
