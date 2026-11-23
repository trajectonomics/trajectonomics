---
status: accepted
---

# Each small feature card puts its robot somewhere else

[ADR 0028](./0028-the-cookie-card-sits-in-the-corner-and-each-small-feature-has-its-robot.md) gave each of the four small Features cards its own pose, all in the card's top-right corner. On 2026-11-23 the owner asked for the robots on cards 04 to 06 as well. They asked that each card place its robot differently, not only in a top-right gap, and that each pose say something about its feature. This record amends ADR 0028 item 4.

## Decision

1. **Four places, one per card.** `Features.astro` names each small card's pose and place in `CARD_MASCOTS`. The card carries the place as `data-mascot-place`, and `mascot-places.css` lays each one out:

   | Card | Pose | Place | What it shows |
   | --- | --- | --- | --- |
   | 03 Deterministic | `same` | Top right, beside the index and the title; the copy runs the full width below. | Two identical cubes under an equals sign: same input, same answer. |
   | 04 Local-first | `local` | Sits on the card's bottom edge at the right, under the words. | Hugs a laptop with a house on its lid: it runs on your machine. |
   | 05 Open source | `open` | Stands under the words at the left and reads them through its glass. | Reads the code through a magnifying glass. |
   | 06 Tax on request | `tax` | Top left; the index and the title sit beside it, and the copy runs the full width below. | Raises a hand to ask, and holds out a percent sign: tax only on request. |

2. **The bottom robots are in the card's flow.** `local` and `open` follow the copy with `margin-top: auto`, so they sink to the bottom of the card. They take back part of the card's bottom padding, so `local` sits on the hairline. Because they are in the flow, the card grows to hold them, and on a wide screen the row's tallest card sets the height. The top-left card is a two-column grid, and the top-right robot is placed absolutely, as ADR 0028 placed it.
3. **The poses suit their places.** `local` is seated with a flat base, so it rests on the edge. `open` faces the upper right, toward the words above it. `tax` turns toward the title beside it. They are rendered and keyed as ADR 0026 describes, with `wave`, `peek` and `same` as the main references.

## Considered Options

- **All four in the top-right corner.** Rejected. The owner asked for variety, and four identical corners read as a pattern, not as four scenes.
- **A robot beside the copy in every card.** Rejected. A small card on a wide screen is about 230 px wide inside, and a side column narrows the copy to a few words a line.
