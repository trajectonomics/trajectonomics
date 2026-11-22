---
status: accepted
---

# The cookie card sits in the corner, and each small feature has its robot

On 2026-11-23 the owner reviewed the live home and asked for four changes:

- Move the cookie banner to the bottom and make it small.
- Take the robot out of the demo's traj chat header, where it doubled the one peeking over the window, and move it lower.
- Take the robot out of the Agent-operated card, since the robot beside the Features heading already stands over it.
- Give cards 03 to 06 a robot each, in a different pose that shows what the feature is.

This record amends [ADR 0024](./0024-the-site-asks-before-it-sets-an-analytics-cookie.md) item 1 and [ADR 0027](./0027-a-phone-always-has-the-mascot-on-screen.md) item 2.

## Decision

1. **The cookie banner is a small card fixed to the bottom-left corner.** It is 22 rem wide from 40 rem up. On a phone it spans the width inside the 16 px gutter. From 40 rem up it stays clear of the copy toast at the bottom right; on a phone the short-lived toast passes over it. It renders last in `main`, so its place in the reading order matches its place on screen. It no longer pushes the hero down, so the hero's copy keeps its own top padding with or without it.
   - The card's background is opaque, so what scrolls under it never changes its contrast. Axe still cannot judge fixed text whose lines sit over different page content: it reports `elmPartiallyObscuring`, the concern behind ADR 0024's in-flow bar. So the axe checks lay the card into the page's flow (`position: static`) before they judge it. Its pixels and colours are the same there, and nothing is excluded from the scan.
   - While the card is up, the footer's words gain bottom padding, so the card covers only the cropped wordmark under them. The page also gains `scroll-padding-bottom`, so a link reached by Tab scrolls clear of the card instead of under it.
   - The question is shorter. It names the cookie, what it holds and how long it lasts. It drops the sentence about cookieless counting and the one about the answer cookie. The footer's "Cookie choice" link and ADR 0024's mechanics are unchanged.
2. **The `hello` robot waves over the traj chat's verdict.** Its hand rests on the verdict's top hairline at the right, and it lands with the verdict. The transcript ends 40 px lower to leave it room, so it never covers a word of the answer.
3. **The Agent-operated card loses `twins`.** The file is deleted.
4. **Each small card has its own robot.** They are made the way ADR 0026 made the first poses: Gemini renders keyed out of a green screen, from ADR 0026's brief with `wave` and `peek` as the main references. Each is a transparent WebP in `public/mascot/`. Each sits in its card's top-right corner (amended by ADR 0029), 64 px wide, beside the index and the title. Only those two leave it a column, and the copy runs the card's full width. ADR 0029 keeps this place for `same` only.
   - `same` (03, Deterministic): holds up two identical cubes under an equals sign. Same input, same answer.
   - `local` (04, Local-first): hugs a laptop with a house on its lid. It runs on your machine.
   - `open` (05, Open source): peers through a magnifying glass. Read the code.
   - `tax` (06, Tax on request): raises a hand and holds out a percent sign. Tax when you ask for it.

   They hold still, and they load lazily. `same` shipped first. The image quota ran out after it, so `local`, `open` and `tax` follow in a second change. [ADR 0029](./0029-each-small-feature-card-puts-its-robot-somewhere-else.md) gives each card its own place, not only the top-right corner.
5. **ADR 0027's rule is relaxed between the Features heading and card 03.** Taking `twins` out leaves the two wide cards with no robot of their own. On a phone, that is roughly a screen of scroll between the heading's `chart` and card 03's `same`. The owner asked for the change, so this record accepts that stretch.

## Considered Options

- **A full-width bar fixed to the bottom.** Rejected. The owner asked for small, and a bar the width of a wide screen covers more of every section than a card does.
- **Keep the banner in the hero, only smaller.** Rejected. The owner asked for the bottom, and the bar still moved the hero down.
- **Move `hello` under the window, outside the demo.** Rejected. Below the window the hero has only its padding, and the pose rests on a line. The verdict's hairline is that line, and it sits where traj's answer lands.
- **Robots in every card, the two wide ones too.** Rejected. The wide cards carry a CLI sample, and the heading's `chart` robot stands on them.
