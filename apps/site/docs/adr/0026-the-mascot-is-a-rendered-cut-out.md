---
status: accepted
---

# The Mascot is a rendered cut-out, not a drawing

[ADR 0025](./0025-the-page-carries-the-mascot.md) put the Mascot on the page as a flat inline SVG drawn from Theme roles. The owner saw it live on 2026-11-22 and rejected it: it read as fake next to the soft 3D robot on the blog's covers, and it lost the character's cuteness. They asked for art made the way the blog's figures were made, by Gemini, and cut out.

## Decision

1. **Each pose is a render, generated to match the cover.** Antigravity (`agy`, `gemini-4-hydrogen-high`) generated the four poses that ADR 0025 named: `peek`, `chart`, `wave` and `lost`. It took the blog's `cover.webp` and `with-traj.webp` as character references, so the robot keeps its shape and look. Each pose was rendered square at 1024 px on a flat `#00FF00` screen, with no floor, shadow, scenery or text. The brief is below, so a later pose can be made the same way.
2. **The screen is keyed out offline, not on the page.** A one-off script with `sharp` turns each render into a trimmed transparent PNG:
   - Alpha is a smoothstep of how much greener than red and blue each pixel is.
   - A despill caps green at the red and blue mean plus 4. This removes the screen's bounce light from the cream shell and leaves the orange eyes and bars as they are.
   - A one-pixel erosion of the matte takes the green-lit rim off with the screen.

   Each cut-out is resized to about twice its largest display size and saved as a lossy WebP with alpha, at quality 82 and alpha quality 90. Only the four WebPs are committed, in `public/mascot/`, about 46 KB in all. The green-screen sources are not committed.
3. **The page shows them as plain images.** `Mascot.astro` renders one `<img>` with an empty `alt`, its file's own `width` and `height` so no layout shifts, and `decoding="async"`. The hero's robot and the Not-found robot load eagerly. The Features and closing robots are below the first view, so they load lazily. An image adds nothing to the page weight budget's HTML and CSS bytes or to Program JavaScript ([ADR 0005](./0005-page-weight-and-web-font-budget.md)).
4. **Placement stays as ADR 0025 set it, and the motion is the whole figure's.** A render cannot blink or move one arm, so:
   - The blink and the arm wave are gone.
   - The hero's robot still climbs up from behind the window's edge once.
   - The closing robot rocks on its feet for about two seconds in every six.
   - The lost robot bobs.

   It is all transforms, declared under `prefers-reduced-motion: no-preference`. Between 40 rem and 68 rem the call-to-action row reaches over the hero's robot, so the robot stays at 72 px wide there. It is 124 px wide above 68 rem.

## Considered Options

- **Keep the SVG and add shading.** Rejected. Gradients would still read as a drawing beside the covers, and the owner asked for the rendered character.
- **Cut the robots out of the blog's own figures.** Rejected. Those figures have the robots overlapping each other and the dunes, and none of them peeks or looks lost.
- **Ship the green-screen PNGs and key them in CSS.** Rejected. CSS cannot key a colour, and a 1024 px PNG is around 450 KB, against about 12 KB for a WebP pose.
- **Ask for a transparent background directly.** Rejected. The image model paints a checkerboard or a soft gradient rather than true alpha, and a flat screen keys cleanly.

## The brief

> Use your image generation tool to create four separate images. The character is the small cute robot mascot in `cover.webp` and `with-traj.webp`: soft matte cream 3D body like smooth vinyl or clay, a rounded rectangular head, a glossy black visor with two glowing round orange eyes, a thin black antenna with a small orange ball, short stubby arms and legs. Soft studio lighting, gentle shadows, very cute and friendly. Background for every image: perfectly flat, uniform, pure chroma-key green (#00FF00), no gradient, floor, shadow, scenery or text, and no green on the robot. Square, centred, nothing cropped unless stated.
>
> 1. `peek`: only the head and two hands, peeking over the top edge of a wall; the hands grip the bottom edge of the frame, which cuts the robot off in a straight line. Cheerful.
> 2. `chart`: standing, front view, holding a small cream card in front of its belly with four orange bars rising left to right. Proud.
> 3. `wave`: standing, front view, waving hello with the right arm raised high.
> 4. `lost`: standing, head tilted, one hand scratching its head, a single orange 3D question mark floating above it. Puzzled.
