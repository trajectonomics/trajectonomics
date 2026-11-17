---
status: accepted
---

# The hero's field leaves the centre, and the headline is regular weight

## Status

Accepted. The owner asked for it after [ADR 0013](./0013-the-hero-ripples-on-click-and-holds-still-on-hover.md) merged: the all-bold headline "is bad", but the background steals attention from the text, and the headline should still be the main thing a visitor reads. It supersedes ADR 0013's bold decision, and it changes the mask [ADR 0010](./0010-the-hero-carries-a-pixel-blast-field.md) set.

## Decision

- **The cause was the ground, not the weight.** ADR 0010's radial mask on the field is strongest at 50% by 30%, which is where the headline sits, so the 6 px squares were densest behind the letters and close in scale to Aleo's strokes. Bold only out-shouted the field.
- **The field leaves the centre.** `.hero-blast-field` carries a second radial layer, a clearing of 46% by 52% at 50% by 48% that is transparent to 62% of its radius and opaque at its edge, intersected with the existing one (`mask-composite: intersect`). The squares frame the headline, the subline and the install command and keep off them. The tile, the drift, the ripple and the 0.30 resting strength are unchanged, and the ripple rides the same mask, so a ring fades out as it crosses the clearing.
- **The headline is regular, not bold.** The hero's `h1` is weight 400, the heaviest face the brand package ships, so no bold is drawn from a lighter one. The section headings stay at 300. No part of the headline is bold: bold on the accent alone and bold on the first word were both tried and set aside by the owner.
- **The accent stays orange**, at regular weight. Measured in ADR 0013 and unchanged.
- **The headline's words changed.** English reads "Deterministic layers for" plus the accent "Financial Planning" (without "your"). Thai reads "ชุดเครื่องมือสำหรับ" plus the accent "การวางแผนการเงิน", the owner's wording; its accent drops "ของคุณ" to match the English.

## Considered Options

- **Lower the field's opacity everywhere.** Rejected: ADR 0010 measured 0.30 as the most the copy carries, and a weaker field loses the ground the owner asked for; the problem is where the squares are, not how many.
- **Light weight (300) with the same field.** Rejected: rendered, it made the headline weaker, not calmer.
- **Bold the accent, or only the first word.** Rejected by the owner after seeing both.
- **A hard-edged clearing.** Rejected: a soft edge keeps the field reading as one ground that thins rather than a shape cut out of it.

## Consequences

- `hero.test.ts` holds the weight (`font-normal`, no `font-bold`, no `<strong>`); `dictionary.test.ts` holds the new words.
- The Thai headline no longer says "deterministic"; it says what the product is, a toolkit, which is the owner's choice. The sections below still make the repeatability claim.
- The clearing size is the one knob: widening it moves the squares towards the edges, narrowing it brings them back behind the copy.
