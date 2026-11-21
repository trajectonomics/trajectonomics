---
status: accepted
---

# Production ships the dark Theme; every other build ships both

Until this record, the Site answered the device: `<html>` carried `data-theme="light"` as a fallback, an
inline script rewrote it to `dark` when the device asked, and the head carried one `theme-color` per
device scheme. Two Themes shipped, and a visitor saw whichever their device asked for
([ADR 0011](./0011-the-site-ships-the-light-theme.md), which recorded a light-only direction that this
record and the owner's next word supersede).

The owner changed their mind on 2026-11-17, in the Run thread for the Docs Portal's copy of the decision
(docs#89):

> "hey I change my mind can we only expose the dark them only and the site repo too only dark theme"

and then corrected how to do it:

> "nono not foce like this but like in production we only show dark theme but for screenshot still have
> light theme (let force it only in production is that possble like we need to resolve the theme right? )"

So the forcing is a property of the **build**, not of the shipped list forever: production resolves to
one Theme, and the build the evidence comes from resolves to both.

## Decision

- **A production build ships one Theme: dark.** `bun run build` is what deploys, and in it every page
  writes `data-theme="dark"`, carries no Theme script at all, and paints the browser's bar `#0a0a0a` once,
  with no `media`. A light device sees the dark page, a dark bar and dark scrollbars.
- **Every other build ships both Themes and follows the device.** A preview build
  (`bun run build:preview`), `astro dev` and the component tests resolve to `["light", "dark"]`: the page
  asks for `light`, the script follows the device before first paint, and the head paints one bar per
  device scheme. That is what keeps the light Theme renderable, capturable and unable to rot while it is
  deferred.
- **The Build Mode resolves the Theme, and nothing decides it at runtime in production.** One Pure Core
  module holds the production Theme and the two preview Themes, and `shippedThemes(mode)` says which
  Themes a build ships. The layout, the browser's-bar paints, the Theme script and every built-file rule
  read it; no JavaScript chooses a Theme in a build that ships one.
- **The stylesheet states each Theme's own `color-scheme`.** The pinned Theme CSS is a `[data-theme="…"]`
  block of custom properties and states no `color-scheme`, so a browser would keep its own scrollbars over
  a page of the other scheme. The Site's sheet declares `color-scheme: light` under
  `[data-theme="light"]` and `color-scheme: dark` under `[data-theme="dark"]`, so whichever Theme a page
  paints, the browser's chrome follows it.
- **The rules hold each build's shape, and none is widened.** The attribute rule requires a Theme the
  build ships, so a production page asking for `light` fails and a preview page may ask for either. The
  paint rule requires exactly the `media` the shipped set states: none in production, one device query per
  Theme in preview. The colour-scheme rule requires a declaration for every Theme the build ships. The
  device-scheme rule fires only in a build that ships one Theme — a build that follows the device needs
  the query on purpose.
- **`bun run check` judges both shapes.** It scans a preview build in preview mode and then a production
  build in production mode, so neither the two-Theme path nor the forcing can rot unobserved.
- **The evidence keeps both device schemes.** The committed captures stay at 1280, 2000 and 390 px in both
  Languages, light-device and dark-device, and they are captured from a preview build: the light device
  shows the light Theme and the dark device the dark one. The automated visual baselines are one set,
  captured from a production build with the device in light, because that is the case production has to
  ignore.

## Considered Options

- **Force dark in every build.** Rejected: the evidence could not show the light Theme at all, and the
  owner asked for exactly the opposite ("for screenshot still have light theme").
- **Keep following the device in production.** Rejected: the owner wants one Theme for visitors.
- **Delete the light Theme from the build.** Rejected: light is deferred, not removed, and the rules that
  judge both published Themes are what keep it from rotting.
- **Detect production by origin in a script.** Rejected: the Build Mode already says which build this is,
  and a script that decides a Theme costs Program JavaScript the production page does not need.
- **Keep a Theme script and pin it to dark in production.** Rejected: a script that decides nothing costs
  Program JavaScript, and the device query it needs is what the production rule forbids.

## Consequences

- The visible change from ADR 0011's state is production's: a visitor on a light device now sees the dark
  page, a `#0a0a0a` browser bar and dark scrollbars instead of the light ones.
- `[data-theme="dark"] .hero-blast-pixels` in `src/styles/blast.css` was dormant while light shipped and is
  live in production: the hero's pixel field draws at the dark Theme's own tuned `0.34` opacity. A preview
  build draws each Theme's own value.
- Restoring light as the production Theme is one constant: `PRODUCTION_THEME`. The two-Theme path, its
  script, its paints, its rules and both capture halves already exist.
- `bun run check` builds twice instead of once, and the browser checks judge a production build, so the
  forcing is exercised by a real browser as well as by the built-file rules.
- The phrase "in both Themes" in [ADR 0004](./0004-landing-page-redesign.md) and
  [ADR 0007](./0007-landing-page-restyle-twenty-language.md) now describes what a stylesheet and a preview
  build carry, not what a production visitor gets.
