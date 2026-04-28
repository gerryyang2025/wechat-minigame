# WeChat Backend and Auth Guide

This document explains when the projects in this repository should integrate a custom backend, how the standard WeChat minigame login flow works, and which official references should be used when the integration starts.

## Current Repository Position

The current repository is still primarily a local single-player minigame collection.

At the time of writing:

- `plane-game` and `plane-game2` use local storage plus WeChat hosted friend-leaderboard data through open data context
- `defense-game` is a local single-player tower-defense loop
- `marvel-game` is a local single-player campaign slice
- there is no custom backend, custom token flow, or server-synced player profile in the current codebase

Relevant local references:

- [plane-game/src/minigame-runtime.js](./plane-game/src/minigame-runtime.js)
- [plane-game/openDataContext/index.js](./plane-game/openDataContext/index.js)
- [plane-game2/src/minigame-runtime.js](./plane-game2/src/minigame-runtime.js)
- [plane-game2/openDataContext/index.js](./plane-game2/openDataContext/index.js)
- [defense-game/README.md](./defense-game/README.md)
- [marvel-game/README.md](./marvel-game/README.md)

## When A Custom Backend Is Not Necessary

A custom backend is usually unnecessary when all of the following are true:

- the game is fully playable as a local single-player experience
- progress can stay on the current device
- the product only needs WeChat friend leaderboard capability instead of a global leaderboard
- there is no in-game payment, no reward fulfillment, and no user account center
- there is no need to prevent score tampering with server-side validation
- content, balance values, and event switches do not need remote updates

For the current repository, this is still the default state.

## Scenarios That Should Trigger Backend Integration

Once one or more of the following goals becomes important, a custom backend should be treated as required rather than optional.

### 1. Cross-Device Accounts Or Save Sync

Use a backend when the same player should keep progress across devices or after reinstalling the game.

Examples:

- unlocked heroes or stages
- inventory, currencies, and cosmetics
- chapter completion and star ratings
- per-player settings that should follow the account

### 2. Global Leaderboards

WeChat open data context is suitable for friend ranking, but it is not a replacement for a cross-user global leaderboard under your own control.

Use a backend when you need:

- global daily, weekly, or all-time leaderboards
- region-based or season-based ranking
- anti-cheat verification before a score is accepted
- historical leaderboard records

### 3. Anti-Cheat And Score Validation

Pure client-side scores are easy to manipulate.

Use a backend when you need:

- trusted score submission
- replay, checksum, or combat-result verification
- abuse detection
- ban lists or suspicious-account review

### 4. Payments, Orders, And Reward Fulfillment

Any monetization or reward claim flow should be backed by a server-controlled source of truth.

Examples:

- consumable item purchases
- battle pass or subscription unlocks
- coupon redemption
- event rewards and compensation mail

### 5. Live Operations And Remote Configuration

Use a backend when gameplay or event settings should change without shipping a new package.

Examples:

- limited-time events
- remote difficulty tuning
- feature flags
- maintenance notices
- A/B experiments

### 6. Analytics And Business Reporting

Third-party analytics may cover basic reporting, but a custom backend becomes valuable when product decisions depend on first-party gameplay data.

Examples:

- completion funnels
- stage failure heatmaps
- revive usage rate
- retention cohort analysis
- hero usage and balance review

### 7. Community Or Social Systems Beyond WeChat Friend Data

Use a backend when the game needs social features that go beyond platform-hosted friend ranking.

Examples:

- guilds or clubs
- chat
- direct invites with custom room state
- asynchronous gifting
- UGC moderation

### 8. Multiplayer Or Room-Based Gameplay

Any authoritative room state, matchmaking, or synchronized multiplayer flow requires backend services.

Examples:

- co-op stages
- PvP
- room codes
- real-time event coordination

## Current Project Mapping

The current repository does not need a backend for the already-implemented gameplay loop.

That said, the likely future triggers are different by project:

- `plane-game`: custom backend becomes worthwhile if the project adds global ranking, anti-cheat score checks, account-bound progression, or live event rewards
- `plane-game2`: same as `plane-game`, especially if the arcade branch grows into a score-chasing live-ops product
- `defense-game`: backend becomes useful if tower unlocks, chapter progression, currencies, or daily challenge rotation are added
- `marvel-game`: backend becomes useful if hero progression, chapter save sync, unlockable roster expansion, or monetized content is added

## Standard WeChat Login And Auth Flow

When a backend is introduced, the usual minigame login flow should be:

1. The minigame client calls `wx.login()` to request a temporary login code.
2. The client sends that code to the project backend over HTTPS.
3. The backend calls WeChat `auth.code2Session` with the minigame `appid`, `secret`, and the one-time code.
4. WeChat returns `openid`, `session_key`, and possibly `unionid` when that condition is met for the app.
5. The backend creates or looks up the internal player record.
6. The backend issues its own application session or token.
7. The client stores and uses that backend token for future business requests.

In diagram form:

```text
Client
  -> wx.login()
  -> receives code
  -> POST /auth/wechat-login { code }

Backend
  -> call auth.code2Session
  -> receive openid / session_key / optional unionid
  -> create or load internal player
  -> issue backend token

Client
  -> store backend token
  -> call protected business APIs with backend token
```

## What `wx.checkSession()` Is For

`wx.checkSession()` is used to check whether the WeChat session associated with a previous `wx.login()` call is still valid.

Typical rule:

- if `wx.checkSession()` succeeds, the current WeChat session is still usable
- if it fails, the client should call `wx.login()` again and refresh backend login

This helps avoid unnecessary re-login during normal play while still recovering cleanly after session expiry.

## Security Notes

When backend login is added, follow these rules:

- never ship the minigame `secret` to the client
- never expose `session_key` to the client
- treat the `code` from `wx.login()` as short-lived and one-time use
- issue your own backend token instead of treating WeChat `code` as a long-term session
- validate any score, reward, or purchase result on the server side if abuse matters

## Recommended Minimal Rollout Order

If only one project in this repository starts moving toward production operations, the safest phased rollout is:

1. Add backend login only
2. Add player-profile and save-sync endpoints
3. Add score submission plus global leaderboard
4. Add remote config and event management
5. Add payments, rewards, and anti-cheat review tooling

This keeps the first integration small while leaving room for live operations later.

## Relationship To The Existing Friend Leaderboard Flow

The current `plane-game` and `plane-game2` friend leaderboard flow does not require a custom backend.

Those projects currently rely on:

- `wx.setUserCloudStorage()` to upload the local best score
- `wx.getOpenDataContext()` to talk to the subdomain
- `wx.getFriendCloudStorage()` inside the open data context to load friend ranking data

That is a valid platform-native solution for friend ranking, but it is not a substitute for:

- custom account systems
- global ranking
- anti-cheat score verification
- cross-device progression sync

## Official Reference Links

Use official WeChat documentation as the source of truth when implementing backend login or hosted leaderboard behavior:

- `wx.login`:
  https://developers.weixin.qq.com/minigame/dev/api/open-api/login/wx.login.html
- `wx.checkSession`:
  https://developers.weixin.qq.com/minigame/dev/api/open-api/login/wx.checkSession.html
- `auth.code2Session`:
  https://developers.weixin.qq.com/minigame/dev/api-backend/open-api/login/auth.code2Session.html
- open data context overview:
  https://developers.weixin.qq.com/minigame/dev/tutorial/open-ability/open-data.html
- `wx.setUserCloudStorage`:
  https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.setUserCloudStorage.html
- `wx.getFriendCloudStorage`:
  https://developers.weixin.qq.com/minigame/dev/api/open-api/data/wx.getFriendCloudStorage.html

## Summary

For the current repository, backend integration is not yet required for the implemented gameplay.

Backend work should start when the product direction moves from local single-player gameplay toward account-bound progression, trusted score handling, global competition, monetization, or live operations.
