---
name: visual-first
description: "Visual-first design passes: critique a screen, distill it to one focal point, turn text into a picture, cut and plain its words, or design its first run and empty states. Use when building, simplifying or reviewing a screen, chart, landing page or doc page, or writing the words on one."
---

# Visual first

The passes that apply [`DESIGN_PRINCIPLES.md`](https://github.com/trajectonomics/trajectonomics/blob/main/DESIGN_PRINCIPLES.md) to a real screen. The rules live in that file, and this skill is how to apply them. Read it first: at the root of `trajectonomics/trajectonomics`, or from another repository with `gh api repos/trajectonomics/trajectonomics/contents/DESIGN_PRINCIPLES.md -H "Accept: application/vnd.github.raw"`.

## Pick the pass

| Pass | Run it when | Reference |
|---|---|---|
| critique | you review a screen, or no pass is named | [reference/critique.md](reference/critique.md) |
| distill | more than one thing on a screen asks for attention | [reference/distill.md](reference/distill.md) |
| visualize | words explain a figure, a trend, a share, a state or a process | [reference/visualize.md](reference/visualize.md) |
| clarify | a label, a sentence, a button or an error message | [reference/clarify.md](reference/clarify.md) |
| onboard | a first run, an empty state, or a screen with no data yet | [reference/onboard.md](reference/onboard.md) |

With no pass named, run critique, then the passes its findings name, in this order: distill, visualize, clarify. Structure comes before pictures, and pictures before words, so no word is polished that distill would remove.

## The surface sets the ambition

| Surface | Mode | What good looks like |
|---|---|---|
| Dashboard, OpenJot | Operate: the person checks a figure or makes a decision | restraint: patterns they already know, scannable, the same control in the same place on every screen |
| Docs, blog | Read: the person learns | a heading that answers, then a picture for each idea |
| The Site's landing pages | Persuade: the person decides to try `traj` | one claim, one picture of the real product, one action |

## The loop

1. **See it.** Serve the page (the package's `dev` script; for the Dashboard, the browser checks write screenshots to `apps/web/screenshots/`). Screenshot it at 390px and 1280px wide into a directory you made with `mktemp -d -p ~/.cache`: `apps/web/node_modules/.bin/playwright screenshot --viewport-size=390,844 <url> <dir>/before-390.png`. Open each PNG and look at it.
2. **Inventory the first screen**, meaning what a 390px phone shows before scrolling. List every element with its rung on the ladder and its word count. Total the focal points, the primary actions and the words. This list is the before.
3. **Run the pass** from its reference.
4. **See it again** at both widths, and in both themes when the surface has two. The pass is done when its reference's completion test holds.
5. **Show it.** The pull request carries the before and after screenshots, and the inventory's totals before → after (for example "words on the first screen: 64 → 9").

## Guardrails

- A figure is shown as its source states it. In the Dashboard the CLI is the only source ([web ADR 0002](https://github.com/trajectonomics/trajectonomics/blob/main/apps/web/docs/adr/0002-the-cli-is-the-only-source-of-figures.md)): shorten an amount with `formatCompact`, and compute nothing.
- Every fact taken off the first screen stays reachable one tap away (Details, a table, the hover title, screen-reader text). Removing a fact from the product is the owner's decision.
- Words state only what the product does and what its data says. A name comes from a Read ([web ADR 0029](https://github.com/trajectonomics/trajectonomics/blob/main/apps/web/docs/adr/0029-plan-items-are-named-by-what-a-read-states-and-never-made-up.md)), and a claim on the Site is one the product keeps today.
- Colours, type and spacing come from `@trajectonomics/brand`'s `--ds-*` tokens. Charts are hand-drawn SVG in Svelte 5. The `tufte` skill gives chart craft and `fixing-accessibility` the accessibility check, both within the limits that `DESIGN_PRINCIPLES.md` sets.
