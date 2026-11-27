# Design principles

A person's attention is the scarcest thing they give us. **Show, don't tell:** show the answer as a picture, and use words only where a picture cannot carry the meaning.

These principles cover everything a person looks at: the Dashboard and its Demo, OpenJot, the Site, the docs, the blog, the data site, `traj` output that a person reads, and what an agent shows the owner (a pull request, a design proposal or a reply). Read them before you build, change or review any of these.

## The ladder

Start on the top rung. Go down one rung only when the rung above cannot carry the meaning.

| Rung | Use it for | Example |
|---|---|---|
| 1. Picture | the shape of the answer: a trend, a share, a comparison, a state | the net-worth line, grey while working and orange once free to stop |
| 2. Number on the picture | the one figure the person came for, written where the eye already is | "Oct 2040" on the curve |
| 3. Label | a name, in one to three words | "Today's money" |
| 4. One sentence | what a label cannot say, in about 15 words at most | "Lasts to 2053 in 193 of 200 markets." |
| 5. Paragraph | the last resort: behind Details, never on the first screen | how the chance of success is worked out |

## Before and after

| Before | After |
|---|---|
| a banner, a heading, an intro sentence and cards, then the chart | the chart first, with "Oct 2040" written on the curve |
| `1,213,456.78` on a card | `1.21M`, and the exact amount in Details and on hover |
| "193 of 200 seeded Market paths" | a ring filled to 193 of 200, labelled "Lasts to 2053" |
| "Your ledger has 2 warnings." | a dot on Records |
| 22 navigation entries | 9, with the rest one level down |

## Principles

1. **One focal point per screen.** A screen has one question, one chart with the answer written on it, and at most one primary action. Everything else goes below it and draws less attention.
2. **Answer first.** The screen opens on the result. It has one title and goes straight to the answer, with no intro sentence and no "This page shows".
3. **Label the data.** Names and values go on the marks themselves. A legend makes the eye travel; use one only when direct labels would collide.
4. **State is a shape.** Show ok, warning, done or behind with an icon, a colour, a position or a dot. Pair every colour with a shape or a word, so colour is never the only signal.
5. **Compact first, exact one tap away.** A card shows the compact amount. The Details drawer, the tables, the hover title and the screen-reader text keep the exact figure. Simplifying moves a fact one layer down and keeps it.
6. **The person's words.** Words name what the person sees and decides. Engine words ("seeded Market paths", "Nominal", a levy id) belong in Details and in `--json`.
7. **Every word pays rent.** Delete a word and look again. If the screen loses nothing, leave it out.
8. **Simple keeps the figures true.** A picture claims exactly what its figures say: a compact amount is truncated toward zero, a bar starts at zero, and every chart is flat 2D. In the Dashboard, the CLI stays the only source of figures ([web ADR 0002](apps/web/docs/adr/0002-the-cli-is-the-only-source-of-figures.md)). Every picture has a text equivalent that a screen reader reads.

## Explaining something

Docs, landing pages, blog posts, READMEs, pull requests and replies to the owner use the same ladder.

- Open with the picture (a screenshot, a GIF, a diagram, or a before and after), then add a few lines.
- Show a design proposal as a mockup. The owner approved the chart-first Planner (#697) from one.
- Put a comparison in a table and a process in a numbered list or a diagram. Show a change to a screen with screenshots of it before and after, at 360px wide.

## When words win

Words are the right rung when:

- the person must read, copy or check the exact figure (the ledger, a table, a form);
- the statement must be legally or fiscally exact (a tax rule, a licence);
- an error must say what to do next;
- the picture would need a legend longer than the sentence it replaces.

## How we check

- **Review.** A reviewer reads a diff that changes what a person sees against this file, and the pull request shows that screen before and after.
- **The Dashboard's checks.** The browser checks run every page at 360px and 1280px in both themes ([web ADR 0026](apps/web/docs/adr/0026-a-headless-browser-checks-the-demo-at-phone-width-and-in-print.md)). Two more checks are being built: a word guard that keeps engine words off the Demo (#700), and a rule of one display-size element and at most one primary button per page (#707).

## Skills that apply this

- **`tufte`**, for every chart, KPI tile and table of figures. It labels data directly, chooses the chart type and removes chart junk. Where it conflicts with this repository, these rules decide: charts are hand-drawn SVG in Svelte with no chart library, so ignore its React preset; colours come from the brand's `--ds-*` tokens, in place of its red accent; web ADR 0002 decides how a figure is formatted.
- **`fixing-accessibility`**, for every control, icon and chart. Words removed from the screen stay in the accessibility tree: an icon-only button has an accessible name, a decorative icon is hidden from screen readers, and a chart has a text equivalent.
