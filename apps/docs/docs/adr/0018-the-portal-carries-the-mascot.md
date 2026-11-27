---
status: accepted
---

# The Portal carries the Mascot

On 2026-11-27 the owner asked for the Mascot in the Docs Portal, "in some places". The Site already shows it: the soft cream robot with the dark visor, the orange eyes and the orange-tipped antenna, a 3D render cut out of a green screen ([site ADR 0026](https://github.com/trajectonomics/trajectonomics/blob/main/apps/site/docs/adr/0026-the-mascot-is-a-rendered-cut-out.md)). The Portal makes no art of its own; it reuses seven of the Site's transparent WebPs.

## Decision

1. **The Portal copies only the poses it places.** `apps/docs/public/mascot/` holds `peek`, `chart`, `wave`, `lost`, `hello`, `open` and `tax`, byte for byte from `apps/site/public/mascot/`. Astro's `base` is `/docs`, so every URL is `/docs/mascot/<pose>.webp`. A pose is decoration: `alt=""`, `aria-hidden`, no link, no focus, no pointer, and no motion of any kind.
2. **The Mascot has four places.** It never repeats across the width, never floats, and never sticks.
   - **The Landing Page's prompt panel.** `peek` sits on the panel's top edge, its hands over the accent hairline, as the Site's robot rests on its demo window. It loads eagerly and covers neither the heading, the copy control nor the prompt.
   - **The Landing Page's ending.** `wave` stands on the ending's hairline, at the far end and small. It is below the first view, so it loads lazily.
   - **The Not-found page.** `lost` sits above the heading, centred, and loads eagerly.
   - **A few docs pages.** The page's `mascot` frontmatter names a pose, and the layout draws it with the page title: under the title and right-aligned on a phone, at the title's right end from `xl` up, 72 to 96 px tall. It loads eagerly because it is in the first view.
3. **Docs pages pick a pose in frontmatter, never in the MDX body.** The docs collection's schema extends Fumadocs' page schema with an optional closed enum, `chart | hello | open | tax`. The field draws a decoration and is not part of the page's words, so the Markdown twin is byte for byte what it was without it. The pages that name one are the Quickstart (`chart`), Agent (`hello`), Get started (`open`) and the tax contributor guide (`tax`).
4. **The synced tax guide carries its pose from the generator.** `contribute/tax.mdx` is generated from `packages/core/tax/CONTRIBUTING.md` by `bun run sync:tax-guide` ([ADR 0002](./0002-authored-content-with-proposal-only-sync.md)), so `mascot: tax` is written by the generator's frontmatter rather than added to the upstream guide.
5. **The build checks every Mascot it references.** `verify:build` fails a built page that points at a `/docs/mascot/*.webp` the build does not contain, so a deleted file cannot become a broken image.

## Consequences

- The Portal adds seven WebP files, about 66 KB in all, and no HTML, CSS or JavaScript beyond one image tag per place.
- A phone scales the robot down instead of hiding it; at 390 px the prompt's peek is 56 px wide and the docs page's robot is 72 px tall.
- The Site and the Portal now hold copies of the same renders. A redrawn pose changes both folders in one pull request; nothing shares files across the two Workers.

## Considered options

- **Draw a flat SVG robot on the Portal.** Rejected: the owner already rejected a drawn robot on the Site as fake next to the renders ([site ADR 0026](https://github.com/trajectonomics/trajectonomics/blob/main/apps/site/docs/adr/0026-the-mascot-is-a-rendered-cut-out.md)).
- **Put the robot in the MDX body as JSX.** Rejected: the Markdown twins refuse a JSX body, and the twin would lose or change its words.
- **Link the Site's images across Workers.** Rejected: a second Worker's asset path is not a stable contract, and the copy is a few kilobytes.
