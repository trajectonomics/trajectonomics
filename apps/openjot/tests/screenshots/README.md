# Screenshot tests

Each scene in [`scenes.mjs`](scenes.mjs) is one screen of the app, drawn in headless Chrome at a
412×915 phone viewport and compared with the picture committed in [`baseline/`](baseline). A scene
fails when its picture changes, so a pull request shows every visual change it makes.

No dependencies beyond Chrome: it uses the same plumbing as `tests/e2e` (`tests/e2e/harness.mjs`).

## Commands

| Command | What it does |
|---|---|
| `pnpm test:screenshots` | Build, capture every scene, compare with the baselines |
| `pnpm test:screenshots home summary` | Only scenes whose name contains `home` or `summary` |
| `pnpm test:screenshots:update` | Rewrite the baselines that changed, remove ones with no scene |
| `pnpm test:screenshots:update record` | Same, only for matching scenes |

Add `--no-build` to reuse an existing `build/`. Set `CHROME_BIN` if Chrome is not on `PATH`.

## When a scene fails

`tests/screenshots/output/report.html` shows expected, actual and diff side by side (different
pixels are magenta). The folder is not committed.

- The change is a bug: fix it and run again.
- The change is intended: run `pnpm test:screenshots:update`, look at the new pictures, and commit
  them with the change (or take them from CI, see below).

## Adding a scene

Add an entry to `scenes.mjs` (the comment at the top lists the fields and the `page` helpers), run
`pnpm test:screenshots:update <name>`, open the new PNG to check it shows what you meant, and
commit it.

## How the pictures stay the same

[`fixture.mjs`](fixture.mjs) runs in the page before the app. It fakes the Tauri backend with
fixed, made-up data, pins the clock to 18 March 2026 in Bangkok, sets the saved theme, hand and
onboarding state, and turns off animations and transitions. The runner then stills animated
images (the mascot) on their first frame, waits for fonts, and keeps capturing until two captures
in a row are identical.

A scene also fails if the app calls a backend command the fixture does not know, throws, or logs
an error. When you add a backend command that runs on one of these screens, add it to `handlers`
in `fixture.mjs`.

## CI makes the baselines

Text rendering depends on the Chrome version, the operating system and the installed fallback
fonts, so a baseline only holds on the setup that made it. The `Screenshots` job in
`.github/workflows/ci.yml` is that setup: it runs on every pull request, and the committed
baselines are the ones its runner draws. `baseline/meta.json` records what made them.

When the job fails it uploads two artifacts:

- `screenshot-diff`: `report.html` with expected, actual and diff for each failed scene.
- `screenshot-baselines`: the whole `baseline/` folder as the runner draws it now.

If the change is intended, replace the folder with the second artifact and commit:

```sh
rm -r tests/screenshots/baseline
gh run download <run-id> -n screenshot-baselines -D tests/screenshots/baseline
```

A local run is still the fast way to see what a change does. If your machine renders text
differently from the runner, scenes fail locally without a real change; the failing run says so
when `meta.json` does not match your setup. In that case do not commit locally made baselines,
take them from the artifact.

What differs today is only the text the bundled Noto Sans Thai has no glyph for, which falls back
to a system font: the `↑` `↓` arrows on Home and Summary, the `▲` `▼` on Compare, and the
monospace amount in the record sheet. Scenes without those came out identical on the runner and
on a developer machine.
