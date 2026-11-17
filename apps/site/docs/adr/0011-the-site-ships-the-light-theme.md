---
status: accepted
---

# The Site ships the light Theme only

Until this record, the Site answered the device. `<html>` carried `data-theme="light"` as a fallback, an
inline script in the layout rewrote it to `dark` when the visitor's device asked for dark, and the head
carried one `theme-color` per device scheme. Two Themes shipped, and a visitor saw whichever their device
asked for.

The owner decided the Site ships light only for now: "we support both dark mode and light mode, can we
force light mode for all of them first so it easier ... let go with 100 light mode"
([site#56](https://github.com/trajectonomics/site/issues/56)). Dark is deferred, not removed. The Docs
Portal takes the same decision in its own repository (docs#89).

## Decision

- **Every page asks for `light`.** The layout writes `data-theme` at the Theme the Site ships, and no
  script rewrites it: the page carries no Theme script at all, so a visitor gets one Theme with
  JavaScript on and with it off.
- **The shipped Themes are data.** One Pure Core module holds the Themes the Site ships as a frozen list —
  `light` today — and the Theme a page falls back to, which is the first entry. The layout, the paint the
  head writes, the browser-check harness and the built-file rules read it. A *published* Theme is a
  different thing and is still two: published Themes come from the pinned package, and the rules that
  judge them do not read this list.
- **One `theme-color`, with no `media`.** The head paints the browser's bar once, at the shipped Theme's
  `background` role read from the pinned tokens, with no device-scheme query. A second paint would put
  `#0a0a0a` above a white page on a dark device.
- **The stylesheet declares `color-scheme: light`.** The pinned Theme CSS is a `[data-theme="…"]` block of
  custom properties and states no `color-scheme`, so a browser on a dark device would keep dark scrollbars
  above a white page. The Site's own sheet declares it, and a built-file rule holds it.
- **The dark Theme stays in the build, and stays judged.** Both published Themes stay in the stylesheet a
  page loads, and the rule that requires them at the published values is unchanged. The contrast and
  landmark rules still judge both, so the deferred Theme's roles stay readable and wired
  ([ADR 0008](./0008-landmark-surface-roles.md)). The one Site style that names it,
  `[data-theme="dark"] .hero-pointer-glow`, stays where it is and is dormant.
- **The checks narrow, one rule at a time.** The rules that only made sense while the device chose the
  Theme are retired with their Error Codes, and the forcing that replaces them is checked rather than
  assumed: no built page and no stylesheet a page loads names `prefers-color-scheme`, the page's
  `data-theme` names a Theme the Site ships, a `theme-color` states the `media` the shipped set states,
  and the stylesheet declares `color-scheme: light`. No code is widened to cover a rule it did not name.
- **The evidence keeps both device schemes.** The committed captures stay at 1280, 2000 and 390 px in both
  Languages, light and dark-device; the dark-device ones now show the forced light paint, which is how the
  forcing is proven to a reader. The automated visual baselines are one set, captured with the device in
  dark, because two identical sets prove nothing and two browser tests cannot compare against one snapshot
  name.

## Considered Options

- **Keep following the device.** Rejected: the owner's decision is the opposite, and it is theirs.
- **Force the dark Theme instead.** Rejected: the owner chose light ("100 light mode").
- **Delete the dark Theme from the build.** Rejected: dark is deferred, not removed, and the stylesheet
  rule that requires both published Themes at the published values is what keeps the deferred Theme from
  rotting.
- **Keep the flip script and pin it to light.** Rejected: a script that decides nothing costs Program
  JavaScript, and the device query it needs is exactly what the new rule forbids.
- **Two `theme-color` paints, as before.** Rejected: on a dark device the bar would be `#0a0a0a` above a
  white page.
- **One visual baseline set per device scheme.** Rejected: the sets would be identical, and two browser
  tests cannot compare against one snapshot name.

## Consequences

- `src/lib/build/` loses the JavaScript-off fallback code, the two inline-theme-script codes and the
  device-scheme `media` code, and gains one code each for a `data-theme` naming a Theme the Site does not
  ship, a `prefers-color-scheme` in a built page or in the stylesheet it loads, a `theme-color` whose
  `media` the shipped set does not state, and a stylesheet without `color-scheme: light`.
- The browser checks keep setting both device schemes, and expect the shipped Theme from both.
- The visual baselines drop the Theme from their names and halve in number; `docs/screenshots/` keeps both
  device schemes, as factory ADR 0017 asks of a Surface ticket.
- Restoring dark is one entry in the shipped list for behaviour — the script, the second paint and the
  device-scheme expectations are derived — plus the retired rules, the second baseline set and its names.
  A small diff, not a rebuild.
- The phrase "in both Themes" in [ADR 0004](./0004-landing-page-redesign.md) and
  [ADR 0007](./0007-landing-page-restyle-twenty-language.md) now describes what the stylesheet carries,
  not what a visitor gets.
