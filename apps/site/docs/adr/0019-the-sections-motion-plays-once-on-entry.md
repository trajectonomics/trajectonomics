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
- A new animated section is a timeline entry, one attribute on its root and a block in `motion-sections.css`; nothing else.
- The budgets do not move: page weight stays under 50,000 bytes gzip, Program JavaScript under 10,000 bytes, and no new Invariant or Error Code is created, because no new invariant exists.
- The `Replay` control is the only new control on the home. It is a `<button>` with a focus ring, it replays one section, and it is not in the tab order where there is no motion to replay.
