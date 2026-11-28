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
ADR 0022's drawn app window; and it amends the first version of this decision, which loaded the
Dashboard with the page.

That first version failed the Site's own mobile performance budget. A same-origin iframe runs the
Dashboard's JavaScript on the home page's main thread, which took Total Blocking Time to 390 ms
(score 0.69), and the Dashboard's hydration reflowed inside the hero's first view: its `main` moved
28 px, its footer dropped and the plan picker widened, for a Cumulative Layout Shift of 0.194 (score
0.63). The page measured 0.79 in English and 0.84 in Thai against the 0.95 median of
[ADR 0005](./0005-page-weight-and-web-font-budget.md). This record is the approved repair: the hero
window is a click-to-load facade, and the Dashboard loads on the visitor's first interaction or on a
click.

## Decision

- **`LiveWindow.astro` is what the hero carries.** The hero's `.hero-app` renders
  `src/components/LiveWindow.astro`: the `.live` frame with its bar (the dots, the title, the zoom
  group, the status line and the way out to `/demo/`) and the viewport below it. The window sits where
  the drawn one sat, in the hero's 67 rem column, with no margin of its own: the copy above it is the
  only gap. The window's wrapper keeps `id="demo"`, so an old `#demo` anchor still lands on the
  window.
- **The Dashboard loads from a click-to-load facade, not with the page.** Inside the viewport
  (`[data-live-viewport]`) the component renders a real link: `<a class="live-start" data-live-start
  href="/demo/">` with the Dictionary's `liveDemoStart` ("Try the live Dashboard" / "ลองใช้
  Dashboard จริง"), and the frame's title carried in `data-live-title`. The link is a filled control
  on the primary role, in the meta face, `min-height: 2.5rem`, with a `--ds-color-ring`
  `:focus-visible` ring, centred on the `--ds-color-muted` surface, so an unloaded window reads as an
  app window waiting to start. The viewport keeps its fixed `min(75svh, 46rem)` height, so nothing on
  the page moves when the Dashboard arrives.
- **The inline script starts it once.** It marks `[data-live]` with `data-live-ready`, the only state
  in which `.live-start` is shown, so a page with no script never offers the link. `startDemo()` runs on a
  plain click on the facade (the default is prevented, so the visitor stays on the page; a click with
  a modifier key or another button keeps its browser meaning and opens `/demo/` elsewhere) or on the
  visitor's first `pointerdown`, `keydown`, `touchstart`, `wheel` or `scroll` anywhere on the window;
  each listener is `{ once: true, passive: true }` and the others are removed when the first fires. It
  creates the iframe (`data-live-frame`, the facade's `href`, its title from `data-live-title`, and no
  `loading="lazy"`) and inserts it hidden through `data-live-loading`, which is `visibility: hidden`.
  On the frame's `load` event it waits two `requestAnimationFrame`s, then reveals the frame, removes
  the facade, and moves the focus to the frame when the facade had it, so a keyboard visitor does not
  lose their place. The frame has no transition, so the reduced-motion kill switch cannot leave it
  hidden at that moment, and it draws the `--ds-color-ring` outline inside its box while it has the
  focus. Nothing starts on a timer, and nothing follows the pointer.
- **A visitor with no script gets the iframe.** The same iframe, with `data-live-frame`,
  `src="/demo/"`, the Dictionary's title and `loading="lazy"`, ships inside `<noscript>` in the
  viewport. A page with no script therefore shows the Dashboard at 100% as before, and `.live-start`
  stays hidden because only the script sets `data-live-ready`. The zoom controls still ship
  `disabled`, so no control is offered that cannot work.
- **Lighthouse never loads the Dashboard.** Its run interacts with nothing: it does not click, type,
  scroll or wheel, so none of the start triggers fires. The measured page is the Site's own: the
  facade's markup and CSS, one small inline script, and no Dashboard JavaScript on the main thread and
  no Dashboard reflow in the first view.
- **The zoom, the bar and the policy are ADR 0034's, unchanged.** Browser-style zoom from 50% to 125%
  starting at 100%; the script enables the three controls and marks an end `aria-disabled`; the status
  line says each level; nothing is stored; and the zoom works before and after the Dashboard loads.
  `/demo/*` keeps `frame-ancestors 'self'`, scoped to the Site's own origin
  ([ADR 0031](./0031-the-site-serves-the-hosted-demo-with-a-scoped-csp.md)).
- **The way out is the bar's link.** The bar's `liveDemoOpen` ("Open full page") link points at
  `DEMO_PATH`, and the built-file rule that requires an `<a href="/demo/">` on every Language home is
  satisfied by it and by the facade.
- **The Mascot still peeks over the top edge.** `<Mascot pose="peek" />` sits over the window's bar
  with the same positioning in `mascot.css`, held above the bar's own padding so its hands never
  reach the zoom controls or the way out. It is decoration with no pointer events, so it neither
  blocks the bar's controls nor takes a click.
- **The drawn window and everything only it used are removed.** `DemoWindow.astro`, `ChatMessage.astro`,
  `src/lib/motion/timeline.ts`, their tests, the browser checks that drove them, the stylesheets whose
  selectors no longer match anything rendered (`app-side.css`, `app-chat.css`, `app-composer.css`,
  `app-stage.css`, `conversation.css`, `terminal.css`, `replay.css`, `motion-app.css`), the `Reveal`
  layer and the Dictionary keys only they read are deleted. `app.css` keeps only the three window dots
  (`.app-dots`) the live window's bar still draws. The demo's transcript now exists only as text in
  `/llms-full.txt`: the page shows the live Dashboard instead.

## Retired from earlier records

- **[ADR 0017](./0017-the-hero-rim-brightens-the-field-outside-the-copy.md): the rim's numbers.**
  The live window makes the hero shorter, so the percentages that placed the rim moved: its empty band
  now runs to 38% of the hero and fills by 50%, and its clearing is an ellipse of 480 px by 330 px at
  50% by 30%, so the headline, the subline and the call to action still sit on the plain field. The
  rim itself, its tile, its strength and why the cap does not apply stand.
- **[ADR 0019](./0019-the-sections-motion-plays-once-on-entry.md): the Reveal script, the timeline and
  the `Replay` control.** Nothing on the page stages a section from a script any more; the timeline
  module and the control that replayed a section are gone with the drawn chats, so the page's motion
  is its own CSS load-in and the Mascot's, and no section needs a script to be read.
- **[ADR 0021](./0021-the-browser-checks-judge-a-phone-and-the-demo-output-wraps.md): the
  `.terminal-output` wrap.** The output block is no longer on the page. The same JSON is written as a
  Markdown code fence in `/llms-full.txt`, where nothing scrolls and nothing wraps.
- **[ADR 0022](./0022-the-hero-carries-one-app-window-and-the-page-loses-how-it-works.md): the drawn
  window.** The hero carries the Dashboard instead of a picture of the chat that produced it. Its
  removal of How it works stands.
- **[ADR 0027](./0027-a-phone-always-has-the-mascot-on-screen.md) and
  [ADR 0028](./0028-the-cookie-card-sits-in-the-corner-and-each-small-feature-has-its-robot.md): the
  home's `hello` robot over the chat verdict.** The verdict is gone, so that place and its pose are
  gone. The Mascot's other places stand, including the `peek` over the hero window.
- **[ADR 0031](./0031-the-site-serves-the-hosted-demo-with-a-scoped-csp.md): the link under the hero
  window.** The "Try the demo" link under the drawn window is gone; the bar's "Open full page" link
  replaces it. The Demo's hosting, its copied assets and its scoped policy stand.
- **[ADR 0034](./0034-the-home-embeds-the-live-demo-with-a-zoom-control.md): its placement only.** The
  separate Live demo section after the hero is gone. Its zoom, its no-script behaviour and
  `frame-ancestors 'self'` stand, and are now the hero window's.

## Considered Options

- **Load the Dashboard on page load, as the first version did.** Rejected: it is the measured failure
  this record repairs. The same-origin frame puts the Dashboard's JavaScript on the home's main thread
  and its hydration in the home's first view, and the page scores 0.79 in English and 0.84 in Thai against a 0.95 budget.
- **Start it on a timer after load.** Rejected: a timer still fires inside Lighthouse's measurement
  window, so it moves the same work into the audit and hides the cost rather than removing it; a
  visitor on a slow phone would meet the same main-thread work a few seconds in.
- **Show a static screenshot until the visitor clicks.** Rejected: a picture of the Dashboard goes
  stale with every Dashboard change, adds image weight to a page with a 50,000-byte budget
  ([ADR 0005](./0005-page-weight-and-web-font-budget.md)), and cannot be clicked, so it would need a
  second control anyway.
- **Keep the drawn window in the hero and the live Demo below it.** That was ADR 0034, and it asks a
  visitor to read a picture and then scroll to the product. The owner chose the product in the first
  view instead.
- **Put the live window beside the copy rather than under it.** Rejected: the Dashboard's own layout is
  wide, and the hero's one claim reads best above a window as wide as the column, as twenty.com's hero
  does.
- **Keep the "Try the demo" link under the window.** Rejected: the bar already carries the way out, and
  two links to the same page in one view read as two different destinations.

## Consequences

- The home's mobile score returns to the Site's own budget: the Dashboard's main-thread work and its
  hydration shift are outside the home page's measurement, which is the point of the facade.
- A real visitor waits for the Dashboard after their first interaction. The facade says what it does,
  and the viewport's fixed height means the wait moves nothing on the page.
- The Dashboard's own hydration shift — the `main` moving 28 px, the footer dropping and the plan
  picker widening — is a known issue in `apps/web`, tracked separately. The facade keeps it outside
  the home's Cumulative Layout Shift; it does not fix it inside the Dashboard.
- The page's inline JavaScript is 8,826 bytes of the 10,000 budget ([ADR 0005](./0005-page-weight-and-web-font-budget.md));
  the facade's start, its modified-click check, the two-frame reveal and the trigger list are the growth.
- The keyboard check still steps over the frame: Tab enters the Dashboard's own controls, and leaves
  them at the Dashboard's end onto the Site's next control. A keyboard visitor's first key already
  starts the Dashboard, so the facade is usually gone before Tab reaches it; while it is there it is a
  Tab stop with a ring, and Enter on it hands the focus to the frame.
- The accessibility check keeps excluding `[data-live-frame]` from its context, because the Dashboard's
  chart labels sit over drawn shapes axe cannot judge. The window's bar, zoom controls, facade and way
  out remain in the scan.
- The committed visual baselines keep masking `[data-live-viewport]`, because the Dashboard's pixels
  are not the Site's; the facade sits inside that mask and the window keeps its height. The Mascot's
  clearance above the bar moves it a few pixels at 68 rem and wider, inside the baselines' tolerance.
- `/llms-full.txt` now carries the demo the page no longer plays. The Glossary says so, and the file's
  checks assert every line of the answer, not only its opening brace.
