---
status: superseded by 0035
---

# The home embeds the live Demo with a zoom control

The owner decided on 2026-11-28 to put the real, clickable Dashboard on the landing page instead of
only linking it. The hero already draws a picture of the app ([ADR 0022](./0022-the-hero-carries-one-app-window-and-the-page-loses-how-it-works.md));
this record is the step from that picture to the product itself. The hosted build of
`apps/web/dist-hosted/` is served under `/demo/` with its own scoped policy
([ADR 0031](./0031-the-site-serves-the-hosted-demo-with-a-scoped-csp.md)).

## Decision

- **A new section, right after the hero.** `src/components/LiveDemo.astro` renders between `<Hero />`
  and `<Features />` in `Home.astro`, in both Languages. It follows the section pattern of
  [ADR 0012](./0012-one-h2-per-section.md): `section-surface`, `.section-inner`, `.section-head` with
  one eyebrow and one `h2`, one lead sentence, then the window. The hero keeps its "Try the demo" link
  under the drawn window, so the built-file check that requires the link still passes.
- **The window is the hero's app window, around a real iframe.** The title bar reuses the hero
  window's dots and type, and adds the zoom group and a way out to the full page. The iframe is
  `/demo/`, titled by the Dictionary, and `loading="lazy"`, so the Demo's documents load when a
  visitor scrolls near them rather than with the home's own bytes.
- **Zoom behaves like browser zoom.** At zoom `z` the iframe's layout viewport is `1/z` of the visible
  box and is then scaled by `z`: `width: calc(100% / var(--zoom))` with `transform: scale(var(--zoom))`
  and origin `0 0`. Zooming out therefore gives the Dashboard a wider viewport (its desktop layout on
  a phone) and shrinks it to fit the frame. The eight steps are 50%, 67%, 75%, 80%, 90%, 100%, 110% and
  125%, starting at 100%, and the percentage button resets. The viewport's height is
  `min(75svh, 46rem)`, so a zoom step never moves the page.
- **The controls ship disabled and the script enables them.** A page with no script shows the Demo at
  100%, fully usable, and offers no zoom button that cannot work (ADR 0022). The zoom is never stored;
  it is this visit's, not a cookie. Once the script runs, a button at either end is `aria-disabled`
  rather than `disabled`, so a keyboard user's focus stays on it, and a visually hidden status line
  says each new level, because the percentage sits inside the reset button's name.
- **The Site may frame its own Demo.** `/demo/*` now sends `frame-ancestors 'self'` instead of
  `'none'`, in `public/_headers`, in the build's `EXACT` list and in the browser check. Every other
  directive stays as it was, and no `X-Frame-Options` is added: `frame-ancestors` decides for the
  modern browsers, and the Demo is deliberately open to the Site's own origin only.

## Considered Options

- **Replace the hero's drawn chat window with the iframe.** Rejected: the drawn window tells the agent
  story, which is the product's difference, and the live Demo below it is the proof. Replacing it would
  put a loading frame where the page's first claim is.
- **Scale a fixed desktop width down to fit.** Rejected: it makes a phone read the desktop layout at a
  size it cannot tap, and a wide screen would still waste the frame. Browser-style zoom keeps the
  Dashboard's own layout at every step and lets the visitor choose.
- **Leave `frame-ancestors 'none'` and link only.** Rejected: it is the old state, where a visitor
  leaves the page to see the product. The section exists so the product is on the page.
- **Show the Demo at 100% on a phone with no zoom.** Rejected: at 320px the Dashboard is a narrow
  column, and the point of the section is to show what the product looks like. Zooming out is one
  press, and the lead sentence says so.

## Consequences

- The Demo now loads on the home when the visitor scrolls near it. Its HTML, JavaScript and snapshot
  arrive as a separate document, so they do not count against the home's page weight or program
  JavaScript budget ([ADR 0005](./0005-page-weight-and-web-font-budget.md)); the frame adds a few
  hundred bytes of markup, CSS and one small inline script.
- The zoom never changes the page's scroll width: the viewport clips the scaled iframe, and the bar
  wraps on a phone, so a 320px screen keeps its 16px gutters and gets no sideways scroll.
- A visitor without JavaScript gets the Demo at 100% and no zoom controls, which is the usable half of
  the feature rather than a broken one.
- The keyboard check steps over the frame: Tab enters the Dashboard's own controls, the Dashboard paints
  their rings, and Tab leaves them at the Dashboard's end onto the Site's next control. The home's axe
  scan leaves the frame's document out of its context (the `[data-live-frame]` iframe is excluded),
  because the Dashboard's chart labels sit over drawn shapes axe cannot judge; the section's heading,
  zoom controls and way out remain in the scan.
- The visual baseline of the home moves, because the section adds content; the browser check masks the
  iframe's viewport, because its lazy load makes its pixels nondeterministic.
- The Demo's policy now trusts the Site's origin as an ancestor. That is one origin, the Site's own,
  and `frame-ancestors` still refuses every other site. The docs, the blog and the data site share
  that origin ([ADR 0033](./0033-one-host-serves-the-site-docs-blog-and-data.md)), so they could frame
  the Demo too; that is accepted, because the Demo is read-only and carries no sign-in or cookie.
- The keyboard walk reduces motion for itself only; the file's other keyboard checks keep motion.
