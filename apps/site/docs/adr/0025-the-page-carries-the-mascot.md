---
status: superseded
---

# The page carries the Mascot

Items 1, 2, 3 and 5, the blink and arm wave in item 4, and the rejected WebP cut-out below are superseded by [ADR 0026](./0026-the-mascot-is-a-rendered-cut-out.md): the Mascot is now a rendered cut-out shown as an image with an empty `alt`, not an inline SVG. Its four poses, their places and its reduced-motion rule stand.

The owner asked on 2026-11-22 for more personality on the landing page, through the Mascot: the soft cream robot with a dark visor, orange eyes and an orange-tipped antenna that the blog's covers already draw ([blog design brief](../../../blog/docs/design/blog.md)). Before this record the Site had the robot nowhere. The chat's 12 px bot icon is a glyph, not the character.

## Decision

1. **One drawing, four poses, inline SVG.** `src/components/Mascot.astro` draws the robot flat, in the Site's own language: rounded shells, a visor, two eyes and an antenna. It takes a `pose`:
   - `peek` sits on the hero's demo window, with its head and hands over the title bar's top edge.
   - `chart` stands on the Features cards' top edge and holds a card of rising bars, as the blog's "with traj" figure does.
   - `wave` stands above the closing call to action's eyebrow and waves.
   - `lost` stands above the Not-found heading, with its head tilted towards a question mark.

   No raster image ships: the covers are 3D renders on their own backgrounds, and a picture would cost a request and kilobytes for a few hundred bytes of paths.
2. **Every paint is a Semantic Token Role.** The shell is `stage-foreground`, the visor `stage` and the eyes, the antenna tip, the bars and the question mark `accent`. The stage pair is near-white on near-black in both Themes ([ADR 0008](./0008-landmark-surface-roles.md)), so the robot stays light on a dark visor on either surface. On a light one, a 22 % hairline of `stage` draws its edge. The colour-literal check covers the component like any other source.
3. **The Mascot is decoration.** Each drawing is `aria-hidden`, holds no text, and takes no pointer events, so nothing new is read out, focused or clicked. The page keeps its headings, its landmarks and its order.
4. **Its motion is small, idle and transform-only.** The robot blinks every few seconds. The hero's robot climbs up from behind the window's edge once, after the hero rises, clipped by its frame so it never covers the chat. The closing robot waves for about two seconds in every six. The question mark on the Not-found page bobs. Every keyframe is declared under `prefers-reduced-motion: no-preference` (`src/styles/motion-mascot.css`), so a visitor who asks for less motion gets a still robot, and the reduced-motion baselines show it at rest. This departs from [ADR 0019](./0019-the-sections-motion-plays-once-on-entry.md), which rejected an always-running loop for content that moves while it is read. A blink and a wave carry no information, and they sit beside the copy, never over it.
5. **No script, no budget move.** The Mascot is markup and CSS only. On the English home it adds about 0.5 KB of gzipped HTML and 0.6 KB of gzipped CSS against the 50,000-byte page weight budget ([ADR 0005](./0005-page-weight-and-web-font-budget.md)), and nothing to Program JavaScript.

## Considered Options

- **Cut the robot out of a blog cover as a WebP.** Rejected. The covers are lit 3D renders with their own sky and dunes, and a cut-out would clash with the flat panels and hairlines. It would also need one file per pose and a request each.
- **Put the robot in the hero's copy, beside the headline.** Rejected. The headline is the owner's and holds still ([ADR 0012](./0012-one-h2-per-section.md)), and the hero's field already carries the stage's motion. On the window's edge the robot is beside the product, not competing with the words.
- **Wave once on entry with the reveal helper.** Rejected for now. It costs Program JavaScript, and an idle wave with long rests reads the same at any frame the visitor arrives on.
