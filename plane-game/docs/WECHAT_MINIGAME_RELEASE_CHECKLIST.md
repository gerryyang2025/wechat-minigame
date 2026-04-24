# WeChat Minigame Release Checklist

Checked on: 2026-04-24

## 1. Before Importing

- Install WeChat DevTools.
- Sign in with the WeChat account that has access to the minigame AppID.
- Prepare a valid minigame AppID.
- Choose `plane-game/` as the import directory.
- Make sure the project type is **Minigame**.

## 2. During Import

- Select `Minigame` as the project type.
- Confirm that DevTools detects:
  - `game.js`
  - `game.json`
  - `project.config.json`
- If you want to use a local-only AppID override:
  - create `project.private.config.json`, or
  - update the existing local private config file

## 3. Recommended Local Private Config

Create `project.private.config.json` from `project.private.config.example.json`:

```json
{
  "appid": "your-wechat-minigame-appid",
  "libVersion": "latest"
}
```

Notes:

- local private config has higher priority than the shared project config
- the file is already ignored by `.gitignore`

## 4. Runtime Verification Points

- Root entry files exist:
  - `game.js`
  - `game.json`
  - `project.config.json`
- `compileType` is set to `minigame`.
- The game launches without `game.json` errors in DevTools.
- The runtime creates a full-screen canvas through `wx.createCanvas()`.
- Touch drag controls the player plane.
- Pause, resume, restart, and game-over overlays are usable.
- Audio starts, pauses, resumes, and stops correctly across game states.
- The project does not depend on DOM APIs, page files, or keyboard events.
- Best score and local settings still persist across sessions.
- Every image and audio asset in the package is at or below 200 KiB.
- `node scripts/validate.js` passes before upload.
- If DevTools still shows a `component lazy loading` recommendation, confirm the project was imported as **Minigame** and do not add unsupported Mini Program-only `lazyCodeLoading` fields to `game.json`.

## 5. Recommended Checks Before Release

- Test with the real minigame AppID that will be used for release.
- Run the game in WeChat DevTools and on at least one real device.
- Verify safe-area layout, pause button placement, and touch targets across multiple screen sizes.
- Verify the cover screen layout remains readable, with clear spacing between the plane preview, description text, author credit, and start button.
- Verify audio behavior during mute mode, backgrounding, interruption, and app switching.
- Verify restart flow, power-up pickup timing, and game-over behavior.
- Verify player HP pips, non-lethal damage feedback, and the short invincibility window behave consistently across repeated hits.
- Verify that share revive can be used up to three times in a single run and is unavailable after the third revive.
- Verify that share revive grants a short recovery window and that shield break uses the same invincibility rhythm as normal HP damage.
- Verify that supply-drop colors and silhouettes remain distinguishable on real devices, especially when labels are hidden due to size.
- Verify that package size and ignored files are acceptable for upload.
- Verify the largest packaged image/audio asset stays comfortably below the 200 KiB review threshold.

## 6. Remaining Gaps Outside the Current Scope

- monetization is not integrated
- full production leaderboard operations are not complete beyond the current friend leaderboard entry
- backend services and cloud features are not integrated
- privacy prompts and release operations still need final review
- current audio files are still development placeholder assets

These items do not block local development or single-player runtime verification, but they should be completed before a production release.
