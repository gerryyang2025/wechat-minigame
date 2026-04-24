# WeChat Minigame Release Checklist

Checked on: 2026-04-24

## 1. Before Importing

- Install WeChat DevTools.
- Sign in with the WeChat account that has access to the minigame AppID.
- Prepare a valid minigame AppID.
- Choose `plane-game2/` as the import directory.
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
- Player HP, post-hit invincibility, and blink feedback behave consistently across repeated hits.
- Audio starts, pauses, resumes, and stops correctly across game states.
- The project does not depend on DOM APIs, page files, or keyboard events.
- Best score and local settings still persist across sessions.
- Every image, audio, and packaged font asset in the project is at or below 200 KiB.
- `node scripts/validate.js` passes before upload.
- If DevTools still shows a `component lazy loading` recommendation, confirm the project was imported as **Minigame** and do not add unsupported Mini Program-only `lazyCodeLoading` fields to `game.json`.

## 5. Recommended Checks Before Release

- Test with the real minigame AppID that will be used for release.
- Run the game in WeChat DevTools and on at least one real device.
- Verify safe-area layout, pause button placement, and touch targets across multiple screen sizes.
- Verify the cover screen layout remains readable, with clear spacing between the title art, plane preview, description text, author credit, and start button.
- Verify audio behavior during mute mode, backgrounding, interruption, and app switching.
- Verify restart flow, bomb usage, double-laser pickup timing, and game-over behavior.
- Verify that share revive can be used up to three times in a single run and is unavailable after the third revive.
- Verify the shorter double-shot timing still feels readable on real devices.
- Verify that sprites scale correctly on different DPR devices and that large enemies are not visually squashed.
- Verify that the shared `Marker Felt` font loads for gameplay HUD, overlays, and the friend leaderboard; if it does not, confirm the system-font fallback still keeps text readable.
- Verify leaderboard close buttons and local/friend tab switching behave correctly in DevTools and on device.
- Verify that supply-drop sprites remain distinguishable on real devices.
- Verify that package size and ignored files are acceptable for upload.
- Verify the largest packaged image/audio asset stays comfortably below the 200 KiB review threshold and that removed legacy media is not reintroduced into the upload set.

## 6. Remaining Gaps Outside the Current Scope

- monetization is not integrated
- full production leaderboard operations are not complete beyond the current friend leaderboard entry
- backend services and cloud features are not integrated
- privacy prompts and release operations still need final review
- some legacy fallback assets still remain in the package and should be cleaned up if they are no longer used

These items do not block local development or single-player runtime verification, but they should be completed before a production release.
