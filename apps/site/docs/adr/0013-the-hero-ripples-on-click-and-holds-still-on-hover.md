---
status: accepted
---

# The hero's field ripples on a click; nothing follows the pointer; the headline is bold

## Status

Accepted. The owner asked for it: remove the hover effect in the hero ("it kinda annoy me"), enable ripples on the hero's background, and make the headline bold. It amends [ADR 0010](./0010-the-hero-carries-a-pixel-blast-field.md), whose "What is not shipped" ruled ripples out, and it removes the pointer light that ADR 0010 and [ADR 0011](./0011-the-site-ships-the-light-theme.md) mention.

## Decision

- **The pointer light is gone.** The 480 px accent light that followed the pointer, its `pointermove` and `pointerleave` listeners, its `data-pointer-glow` element and its CSS are removed. Nothing in the hero reacts to a hover now. The one Site style that named the dark Theme (`[data-theme="dark"] .hero-pointer-glow`) goes with it, so ADR 0011's note that it "stays where it is and is dormant" no longer applies.
- **The field answers a click with a ripple.** ADR 0010 said ripples "need the live shader". The upstream effect does, but a ring can be cut out of the tile we already ship. A second layer, `.hero-blast-ripple`, paints the same baked tile in `accent` and masks it with a 120 px ring (`mask-composite: intersect`) whose radius is a registered `@property` the keyframes animate from 0 to 1100 px over 1.6 s, fading from 0.55 to 0. The ring lights the squares already on the page; it draws none of its own.
- **The ripple shares the drift layer.** The squares and the ripple sit in one `.hero-blast-drift` wrapper that carries the slow drift, so a ring and the squares it lights never slide against each other. The tile is unchanged and no new request is made.
- **A click, not a hover.** A `click` on the hero that does not land on a link, button, summary or the install command starts the ring at the click point, and a second click restarts it. Taps work; a scroll gesture does not, because `click` does not fire for one. The script is about 0.7 KB and stays far inside the 10,000-byte budget.
- **Reduced motion gets none.** The script returns early under `prefers-reduced-motion: reduce`, and the kill switch in `motion.css` stops an animation that was already running.
- **The headline is bold.** (Superseded by [ADR 0014](./0014-the-hero-field-leaves-the-centre-and-the-headline-is-regular.md): regular weight, and the field leaves the centre.) The hero's `h1` is weight 700; the section headings stay 300. The brand package ships Aleo at 300 and 400, and a 700 file would take about 15 KB of the 48,000-byte font budget (40,632 bytes are used), so the browser draws the bold from the 400 face. Thai still falls through to the visitor's own face, which has a real bold.
- **The accent stays orange.** Measured, not assumed: axe passes the headline and the whole page with the bold orange accent over the field, in both device schemes. An all-ink headline also passes but loses the highlight the owner asked for, and a bold sans headline wraps to three lines and leaves the Brand Typeface.

## Considered Options

- **Keep the pointer light, softer.** Rejected: the owner finds a hover effect annoying; the fix is to take it away.
- **Ripples on pointer move.** Rejected for the same reason: a hover that draws is the thing being removed.
- **Ship the shader for real ripples.** Rejected for ADR 0010's reasons: `three` and `postprocessing` cost far more than the 10,000-byte script budget.
- **Add Aleo 700.** Rejected: it breaks the font budget, and raising a budget is its own decision.

## Consequences

- `hero.test.ts` holds the new shape: one `data-ripple`, a `click` listener, no `pointermove`, no `data-pointer-glow`, a bold `h1`. `e2e/ripple.e2e.ts` holds the behaviour: a click on the ground ripples and clears itself, a click on a control does not, a hover does nothing, and reduced motion gets none.
- The ripple is transient and its strongest frame lies over the copy for a moment, so axe, which runs with reduced motion, judges the settled page, and the field's resting strength (0.30) is still the bound ADR 0010 measured.
- A browser without `@property` shows no ripple and loses nothing else.
