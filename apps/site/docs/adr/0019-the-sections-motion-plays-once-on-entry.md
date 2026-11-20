---
status: accepted
---

# The sections' motion plays once, and the static page is the whole story

The owner asked for the two compare panels and the presentation-layer flow to move instead of being read (site#64), then re-cut them four times in the draft thread: the chat section argues that the agent is grounded rather than that it is deterministic, the panels are conversations rather than tables of runs, the flow names the step that is running, and its three outputs are drawn rather than labelled. A throwaway prototype in that thread settled the look before this record. What follows is the rule those re-cuts produced, so the next section can move without re-arguing it.

## Decision

- **The static state is the whole story.** Every message, step, actor and output is in the markup at its resting opacity. A section's root carries no motion attribute until the reveal helper adds `data-motion`, and only then does CSS animate it, inside `@media (prefers-reduced-motion: no-preference)`. A visitor with motion off, with JavaScript off, or with a browser that ignores both gets the complete exchange, still, and loses no information. Nothing is ever hidden behind an animation that has not run.
- **The gate is a media query, not the kill switch.** The reduced-motion switch in `motion.css` zeroes `animation-duration` and leaves `animation-delay` alone, so a delayed beat would still arrive late. The new keyframes are therefore declared only under `no-preference`, and the helper also refuses to mark a root under `reduce`: two independent belts.
- **One reveal helper, one attribute, once per section.** A single inline script in `Layout.astro` marks each panel root the first time it is in view — synchronously for a root already on screen at load, then with one `IntersectionObserver` that stops observing each root on its first intersection. A panel plays once per page load, never on hover, never in a loop; scrolling back does not replay it.
- **The choreography is data, not keyframe arithmetic.** A pure timeline in `src/lib/motion/timeline.ts` takes the number of beats and returns each beat's start and end plus the sequence's total. Components render each beat's `--step-delay` from it, and the script sequences nothing. Numbers in, numbers out: no clock, DOM or randomness, so a test judges the order and the bound without a browser.
- **Only `opacity` and `transform` animate, with one named exception.** No `display`, `visibility`, `height` or `max-height` animation, so a panel keeps the height it has at first paint and its sibling never reflows. The exception is How it works, where the owner asked for the block to grow as the request reaches the logic layer: the growth is one-shot and **monotonic** — the section only ever gets taller while it plays and ends exactly at its static height, so content below moves down once and never up.
- **The running stage is marked, not narrated.** The stage the flow is in glows on its border (a masked conic gradient with a registered `@property` angle, a solid accent border without it) and carries an agent chip naming the actor of that step. On a phone the running step leaves the list and sticks to the bottom edge of the screen, so the diagram has the reading area; it returns to the list when the flow settles. Both sections carry a `Replay` control that exists only where motion does — hidden under reduced motion, absent with JavaScript off.
- **Decorative motion is not content.** The travelling bot, the running dots and the glow are `aria-hidden` and rest invisible. Nothing announces itself: the Site has no live region, and the page's order is the transcript's order.
- **Named references are references.** `sveltebits.xyz`, reactbits `micro/call-chip` and reactbits `animations/star-border` shaped the look. Both are framework components (Svelte and React with Tailwind); the Site ships static HTML and CSS with no framework runtime ([ADR 0002](./0002-site-worker-with-static-assets.md), [ADR 0004](./0004-landing-page-redesign.md)), so the chip, the travelling border and the rest are rebuilt in CSS and markup. No package, font or image joins the page.
- **One budget, several inline scripts.** ADR 0004 allowed "one small JavaScript reveal layer". The page now ships the Theme script, the header menus, the hero ripple, the analytics client and this helper, all inside the single 10,000-byte Program JavaScript budget, which `PAGE_JAVASCRIPT_OVER_BUDGET` holds. This record says *several* small scripts inside one budget rather than one.

## Considered Options

- **Scroll-driven `animation-timeline: view()` for the whole choreography.** Rejected for the sequences: a scroll timeline has no notion of "the third message, then the second question", and the browsers that support it do not include all of them. The Site keeps using `scroll()` where a single property follows the scroll, as the header does.
- **An always-running CSS loop.** Rejected: the visitor arrives at an arbitrary frame, and a page that moves while it is read is what ADR 0013 removed for the hero.
- **Animating height with `max-height` or a transition on the card.** Rejected: `max-height` needs a magic ceiling and `height` cannot be animated to content. The growth is a `grid-template-rows: 0fr → 1fr` transition, reserved for the one place the owner asked for it.
- **A status line under the steps.** Built, shown to the owner, and replaced at their word: the working indication belongs on the step and the agent, not in a strip below the list.
- **Hiding the beats with `display: none` until they play.** Rejected: it removes text from a crawler's reach and from a screen reader's order, and it makes the panel's height jump.

## Consequences

- The reduced-motion visual baselines are the pixel proof of the shipped static state: they are generated with `reducedMotion: "reduce"`, so an animation that fails to settle cannot pass them.
- The How it works growth is the Site's one layout animation. It is bounded (under twelve seconds), monotonic, and one-shot, and a browser test holds the height against the static height.
- A new animated section is a timeline entry, one attribute on its root and a block in the stylesheet
  that section owns (`src/styles/motion-compare.css`, `motion-flow.css`, `motion-steps.css`); nothing
  else. They are several files rather than one because a stylesheet has the same 100-line ceiling as a
  module, and site#64 filled one.
- The budgets do not move: page weight stays under 50,000 bytes gzip, Program JavaScript under 10,000 bytes, and no new Invariant or Error Code is created, because no new invariant exists.
- The `Replay` control is the only new control on the home. It is a `<button>` with a focus ring, it replays one section, and it is not in the tab order where there is no motion to replay.

## Amendment (2026-11-20, owner): the phone reads one panel, and the diagram alone

The owner's phone review of the comparison found four things this record had got wrong, and they are all
about the *phone*: the before/after tab bar at the top of the comparison was a second thing to press before
anything was read (and its after button never worked, because it carried `data-action-tab` where the script
looked for `data-tab`); the chat was over before a visitor could finish the bad answer; the panels' heights
changed as one replaced the other, so the page moved under the reader; and the flow's step list on a phone was
pinned to the bottom edge as one card, where it was effectively invisible. This section supersedes the tab
pair and the bottom card, and leaves the rest of this record standing.

- **One panel at a time, at one height.** A phone shows the panel whose `data-action-stage` the Reveal layer
  set, and nothing sets a stage under reduced motion or with no script, so both panels stand one above the
  other and whole. The stage is the only thing the script puts on a still page; a motion-off phone keeps the
  whole transcript and no inner scrollbar, which is what the visual baselines pin.
- **One reserved slot under the panels.** The comparison's controls live in a single row under both panels,
  at one height and one style, because the row must not move when the control's words and job change: the
  before chat offers the after one once it has been read, counts five seconds down, and moves there on the
  visitor's tap or on the last second; the after panel's place in the same row offers the chat it came from.
  A visitor with motion off or no script is offered neither, and the section carries no tab bar.
- **Reading pace is a measured number, not a rewrite.** The bad chat holds each message for 1.4 s and pauses
  0.4 s, and the good chat holds a message for 1.0 s and prints a CLI line for 0.2 s, so a visitor cannot be
  outrun by the transcript that argues the agent alone is not enough. The bounds in `SEQUENCE_BOUNDS_MS` rose
  with them (15 s for each chat, still 12 s for the flow), and the sequence carries the CLI's faster pace as
  its own field rather than as a second keyframe rule.
- **A phone reads the diagram alone.** Below 64 rem the four steps leave the layout and the layers diagram is
  the whole section; the step that runs still names its actor, in the chip docked on the stage, which on a
  phone sits in the stage's own flow (the growing block below it clipped the old border-docked chip) and is
  set large enough to read. The steps keep their markup and are only out of the phone's layout, so a screen
  reader still hears all four with their actors. At 64 rem and above the list is untouched.
- **The newest message is followed, not abandoned.** A playing chat's body scrolls to the beat that just
  landed, driven by the animation's own `animationstart` rather than a second timer, so the Reveal layer
  counts no beats of its own.
- **Comments in an inline script are bytes.** The page's 10,000 still stands, and this change needed room; the
  notes above the page's inline scripts now sit in the component's own template, where Astro strips them,
  instead of inside the script the browser downloads.

Considered and rejected: a second tab bar with a working after button (the owner asked for one control, and
the tab bar was the bug); keeping both panels at their natural height and letting the page move (the reader
loses their place every time the panel changes); a CSS-only "follow the newest message" (`column-reverse` and
`justify-content: flex-end` both keep the *last* message in view only by reversing the transcript's reading
order or by making its top unreachable); and docking the phone's step card lower, which the owner had already
judged invisible.

