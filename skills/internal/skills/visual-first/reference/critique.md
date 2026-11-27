# Critique

Review one screen against `DESIGN_PRINCIPLES.md` and name the passes that fix it. Start from the screenshots and the first-screen inventory, with one numbered row per element, from the skill's loop (steps 1 and 2).

## Checks

Run every check on every element of the inventory. A finding names the element, never the screen in general.

1. **Squint.** Look at the 360px screenshot as if it were a thumbnail, and name the element you see first. Check it against the inventory: the element you see first should be the only one at display size and in the accent colour. Exactly one thing stands out, and it is the answer. The support reads second, and the groups are still visible as groups.
2. **Focal point.** Count the display-size elements (one) and the primary buttons (at most one).
3. **Answer first.** The first thing a phone shows is the answer. A banner, an intro sentence, an eyebrow or a heading that repeats the navigation in front of it is a finding.
4. **Ladder.** For each element with words, ask whether the rung above could carry it: a sentence that could be a label, a label that could be a shape or a mark, a paragraph on the first screen.
5. **Labels on the data.** A legend, a caption or an axis title that a direct label could replace.
6. **State.** A status (ok, warning, done, behind) told in a sentence.
7. **Words.** Engine words. A label or a sentence beyond the ladder's limits. An idea said twice on one screen.
8. **Load.** A group of more than four items. More than four sibling choices in one decision. A fact the person must remember from another screen.
9. **Truth.** A figure that differs from its source, is rounded up, or sits on an axis that exaggerates it.
10. **Access.** A picture with no text equivalent, an icon-only control with no name, colour as the only signal. Run `fixing-accessibility` for the full check.

## Report

The verdict comes first:

```text
Overview at 360px: 3 focal points, 2 primary buttons, 64 words on the first screen. Run distill, then clarify.
```

Then one row per finding, most severe first:

| # | Element | Check | Now → after | Fix | Severity |
|---|---|---|---|---|---|
| 1 | intro sentence above the chart | 3 Answer first | rung 4 → gone | the chart leads; the title is the question | P1 |

- **P1**: the person cannot find the answer, or a figure is wrong.
- **P2**: it costs attention: an extra focal point, a sentence where a label would do.
- **P3**: polish.

Report the totals and the findings only. An overall score would be a number with no picture and no context.

## Done when

Every numbered element of the inventory appears in the report, either in a finding's row or in one closing line that lists the numbers of the elements that passed. Every finding names the pass that fixes it.
