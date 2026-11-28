---
status: accepted
---

# The hero is the live Demo

The owner decided on 2026-11-28 that the window in the hero is the real, clickable Dashboard, and
that the drawn chat window is retired. [ADR 0022](./0022-the-hero-carries-one-app-window-and-the-page-loses-how-it-works.md)
put a picture of an agent's chat in the hero, and
[ADR 0034](./0034-the-home-embeds-the-live-demo-with-a-zoom-control.md) put the Dashboard itself in a
separate section below it. A visitor now meets the product in the hero, and the window answers when
they click. This record reverses ADR 0034's rejected option, "Replace the hero's drawn chat window
with the iframe", and its decision to give the Demo a new section after the hero; it supersedes
ADR 0022's drawn app window.

## Decision

- **`LiveWindow.astro` is what the hero carries.** The hero's `.hero-app` renders
  `src/components/LiveWindow.astro`: the `.live` frame with its bar (the dots, the title, the zoom
  group, the status line and the way out to `/demo/`) and the lazy iframe in its viewport. The window
  sits where the drawn one sat, in the hero's 67 rem column, with no margin of its own: the copy above
  it is the only gap. The window's wrapper keeps `id="demo"`, so an old `#demo` anchor still lands on
  the window.
- **The way out is the bar's link.** The "Try the demo" paragraph under the drawn window is removed.
  The bar's `liveDemoOpen` link points at `DEMO_PATH`, and the built-file rule that requires an
  `<a href="/demo/">` on every Language home is satisfied by it.
- **The Mascot still peeks over the top edge.** `<Mascot pose="peek" />` sits over the window's bar as
  it did over the drawn window's, with the same positioning in `mascot.css`. It is decoration with no
  pointer events, so it neither blocks the bar's controls nor takes a click.
- **The zoom, the no-script state and the policy are ADR 0034's, unchanged.** Browser-style zoom from
  50% to 125% starting at 100%; the three controls ship `disabled`, the inline script enables them and
  marks an end `aria-disabled`; the status line says each level; nothing is stored. A visitor without
  JavaScript gets the Dashboard at 100% and no control that cannot work. `/demo/*` keeps
  `frame-ancestors 'self'`, scoped to the Site's own origin
  ([ADR 0031](./0031-the-site-serves-the-hosted-demo-with-a-scoped-csp.md)).
- **The Live demo section is gone.** `LiveDemo.astro`, its place in `Home.astro`, its eyebrow, `h2` and
  lead, and the three Dictionary keys they carried are removed. The window's own keys stay, in both
  Languages.
- **The drawn window and everything only it used are removed.** `DemoWindow.astro`, `ChatMessage.astro`,
  `src/lib/motion/timeline.ts`, their tests, the browser checks that drove them, the stylesheets whose
  selectors no longer match anything rendered (`app-side.css`, `app-chat.css`, `app-composer.css`,
  `app-stage.css`, `conversation.css`, `terminal.css`, `replay.css`, `motion-app.css`) and the
  Dictionary keys only they read are deleted. `app.css` keeps only the three window dots (`.app-dots`)
  the live window's bar still draws. The Reveal layer's inline script in `Layout.astro`, which only
  staged the drawn chats, is gone too.

## Considered Options

- **Keep the drawn window in the hero and the live Demo below it.** That was ADR 0034, and it asks a
  visitor to read a picture and then scroll to the product. The owner chose the product in the first
  view instead.
- **Put the live window beside the copy rather than under it.** Rejected: the Dashboard's own layout is
  wide, and the hero's one claim reads best above a window as wide as the column, as twenty.com's hero
  does.
- **Keep the "Try the demo" link under the window.** Rejected: the bar already carries the way out, and
  two links to the same page in one view read as two different destinations.

## Consequences

- The page loses the agent-chat story picture. The hero's copy, the install prompt and the features
  still tell the story, and `/llms-full.txt` still carries the two exchanges, but a visitor sees the
  Dashboard rather than a drawing of the chat that produced it.
- The home sheds the drawn window's markup and CSS bytes, and the page's Program JavaScript loses the
  Reveal layer's script; the window's zoom script remains.
- The Dashboard now loads on the landing view, so a phone begins fetching `/demo/` as soon as the page
  paints. Its documents are a separate build and do not count against the home's page weight or its
  Program JavaScript budget ([ADR 0005](./0005-page-weight-and-web-font-budget.md)).
- The committed visual baselines of the home move, because the window's content and the page's height
  change; the browser check keeps masking the iframe's viewport, because its lazy load makes its pixels
  nondeterministic.
- The accessibility check keeps excluding `[data-live-frame]` from its context, because the
  Dashboard's chart labels sit over drawn shapes axe cannot judge. The window's bar, zoom controls and
  way out remain in the scan.
- The ripple now ignores a click inside `[data-live]` rather than one inside the drawn window, so the
  bar's own presses stay the window's.
