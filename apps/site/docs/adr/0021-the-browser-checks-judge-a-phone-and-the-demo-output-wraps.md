---
status: superseded in part by 0035
---

# The browser checks judge a phone, and the demo output wraps

The browser accessibility check, `e2e/accessibility.e2e.ts`, ran at the Playwright project's desktop
viewport and nowhere else, so the Site's phone layout was never judged. On 2026-11-18 the hero-rim work
measured the cost: axe at a 390×844 phone reported two findings on the Language homes, in both device schemes,
and
[ADR 0017](./0017-the-hero-rim-brightens-the-field-outside-the-copy.md)'s Consequences recorded them as
belonging to neither that change nor CI's path. That record also named the element wrongly, which is how
`site#74` came to inherit the mistake.

Both findings are one defect on one element: `pre.terminal-output` in See it in action, the `traj fi --json`
output. Its fixture is 382 px wide inside a 286 px content box at 390×844, and `white-space: pre` with
`overflow-x: auto` made it a scroll container. So `"fiDate": "2041-08-01"` sat past the right edge with no
keyboard path to it — `scrollable-region-focusable` — and axe could not judge the text's contrast at all,
because its line boxes ran outside the box the background was painted in. There was no contrast problem to
fix: `#fafafa` on the stage surface `#0a0a0a` is 18.97:1, and the build's `TEXT_CONTRAST_TOO_LOW` Error Code
already held it. axe could not *see* the background, which is a different thing from the text failing.

The owner chose between the two repairs on 2026-11-18, after both were captured from the build and shown side
by side: **wrap the output rather than make it focusable.** Wrapping clears both findings and shows the whole
answer; making the block keyboard-reachable left the contrast run unjudged and the date off-screen.

## Decision

- **The demo output wraps.** `.terminal-output` takes `white-space: pre-wrap` and `overflow-wrap: anywhere`,
  so each JSON line is still its own line and a longer one wraps rather than clipping. The rule stays in
  `src/styles/terminal.css`, where the block already lives.
- **The block is not a scroll container.** It carried `overflow-x: auto` as a valve for a future overflow.
  #110 put the block inside a chat bubble and measured the cost: while the Brand Typeface is still
  loading the fallback face is wider, the box really does overflow for a moment, and the browser makes a
  scrollable region a Tab stop — so a keyboard visitor landed on the output as if it were a control, with
  no focus ring to say so. The wrap above guarantees there is nothing to scroll, so the valve was removed
  rather than a scroll region kept for an overflow that cannot happen.
- **No breakpoint.** The fixture is 382 px wide and the box is 476 px at 1280, so no line reaches the edge
  there and the desktop rendering is unchanged — page height at 1280×800 is identical with and without the
  change, on both homes. The wrap only acts where it is needed.
- **The accessibility check judges a desktop and a phone.** It runs at 1280×800 and at 390×844, so the
  viewport a visitor holds is judged, not only the one on the reviewer's desk.
- **A rule axe cannot judge is a failure, not a log line.** The check expects `results.incomplete` to be empty
  as well as `results.violations`, and its message names each rule id and its node targets. Before this the
  suite printed the incompletes and passed, which is precisely how the contrast finding survived: "I could
  not decide" read as "I looked". This follows the direction ADR 0017 already took when it rejected a
  `background-image` for the hero's rim on the grounds that it would take the copy out of contrast judgement
  altogether.
- **The two viewports are defined once.** `e2e/viewports.ts` holds the pair, and the hero, rim, visual and
  accessibility checks read it. Three files held the same two numbers before this, which is how the
  accessibility check came to hold neither. `e2e/visual.e2e.ts` builds its snapshot filename from its own key
  per viewport, so the module carries the sizes and that file keeps its `-desktop` and `-mobile` names.
- **The phone is 390×844**, the width the hero, rim and visual checks and every committed baseline already
  use. 320×568 and 360×800 were measured and behave the same way; they are not CI cases, and adding one is a
  second entry in the shared module.

## Considered Options

- **Keep the scroll and give the block `tabindex="0"` and a name.** Rejected by the owner. Measured, it clears
  `scrollable-region-focusable` and nothing else: the contrast run stays unjudged, the date still needs a
  sideways scroll, and because no `pre` on the Site has a focus style it would have needed one designed —
  the browser's default white outline is not the Site's `ring` token. So it was not the zero-pixel option it
  looked like.
- **Record the contrast incomplete as an accepted exemption, with a reason.** Rejected: an exemption is a
  standing instruction to stop looking at that text, and ADR 0017 already refused that trade for the hero's
  copy. The wrap removes the need for one.
- **Narrow axe's run, or disable a rule.** Rejected for the same reason: it hides the class of defect instead
  of fixing the instance.
- **Wrap only below a breakpoint.** Rejected: the wrap is inert at every width the baselines cover, so a media
  query would add a rule that changes nothing while making the phone a separate case to maintain.
- **Shorten the fixture so it fits.** Rejected: the JSON is the CLI's own output shape, and the abridged
  fixture is a product fact (`FI_DEMO_OUTPUT`), not copy to be trimmed for a phone.
- **A fourth copy of 390×844 in the accessibility check.** Rejected: three files already held the pair, and a
  fourth copy is how the check lost the phone in the first place.
- **Drop `overflow-x: auto` once nothing scrolls.** Rejected: the panel clips with `overflow: hidden`, so
  dropping the valve would turn a future overflow into silent clipping rather than a scroll container a test
  can find.

## Consequences

- The comparison's phone layout moved twice after this record was written: site#95 made the panels a tabbed
  pair, site#108 rewrote them as two chat transcripts, and site#109 settled it on one panel at a time with a control
  under them. With motion reduced — which is the setting the axe suite runs at — the page lays **both**
  panels out whole, so the demo output is in the judged tree and the After panel needs no interaction to be
  reached. The tab pair site#95 and site#108 carried is gone, and with it the inert After button site#108 left behind.
- The two mobile home baselines move with the layout changes around the wrap, and the desktop and Not-found
  baselines do not change with the wrap itself, byte for byte.
- The twelve `docs/screenshots/site-<language>-<width>-<scheme>.png` renders were refreshed, because a surface
  ticket's pull request carries them at 1280, 2000 and 390, dark and light, in both Languages. They are
  captured with motion reduced, so each is the settled page and the 390 ones show both transcripts, the
  demo output among them.
- The axe suite stays twelve runs, and a phone home is judged in the state the suite sets: both panels laid
  out, because reduced motion is what the check asks for and what the page answers with. A future
  `axe-core` upgrade that adds a rule axe cannot decide turns the check red; that is the review this record
  wants, and `@axe-core/playwright` is pinned to an exact version.
- An element that outgrows its box now fails a named check on a phone-wide run instead of reaching production
  unjudged. That is the class this record is about, not the one block it was found on.
- [ADR 0017](./0017-the-hero-rim-brightens-the-field-outside-the-copy.md)'s Consequences carried the wrong
  element for these findings and said they were outside CI's path; `site#74` corrected that line.
- The wrap costs one line of height on a phone and gives up the JSON column alignment for the one line that
  wraps. That is the trade the owner accepted, and it is visible in the committed baselines.
