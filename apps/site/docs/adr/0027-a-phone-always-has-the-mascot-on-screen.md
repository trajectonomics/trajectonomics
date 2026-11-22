---
status: accepted
---

# A phone always has the Mascot on screen

[ADR 0025](./0025-the-page-carries-the-mascot.md) and [ADR 0026](./0026-the-mascot-is-a-rendered-cut-out.md) put the Mascot in four places; this record extends both. On 2026-11-22 the owner asked for more, by a rule of thumb: a visitor scrolling the home on a phone should always see the robot, so they learn that it is ours and remember it. They did not want it repeated across the width or floating over the page.

Measured at 390 × 844, the four places left three stretches with no robot on screen. Between the hero and the Features heading the gap is about 1,200 px of scroll with reduced motion; with motion on, the demo shows one chat at a time and the stretch closes. Between the Features heading and the closing call to action it is about 1,800 px. In the footer it is the last screen.

## Decision

1. **The rule.** On a 390 × 844 phone with motion on, at most about one tenth of a screen of scrolling shows no robot, and every place is in the page's flow. No robot is sticky, fixed or repeated, and each sits in its own section's free space.
2. **Four more places, four more poses.** They are made the way ADR 0026 made the first four: Gemini renders keyed out of a green screen, from ADR 0026's brief with the `wave` and `peek` renders added as the main references, so the new ones match them. Each is a transparent WebP in `public/mascot/`.
   - `hello` is in the demo's traj chat header, between the title and the tag. It is the head and one hand resting on the hairline, with the other hand waving where the traj skill joins the chat. It shows wherever that chat does.
   - `twins` is in the Agent-operated feature card, at the right of its words and under its sample. It holds up two checked cards, a command's described input and output. The card's index, title and copy leave it a 76 px column. It is the Agent-operated card rather than Deterministic because the third card sits about 150 px lower on a phone, which would leave a quarter screen with no robot.
   - `think` sits beside the FAQ heading, hand on chin under a lit bulb. On a wide screen it sits under the heading in the sticky left column.
   - `sit` is in the footer's link grid. It takes the free cell beside Help on a phone, and the cell under Help on a wider screen. A negative margin equal to the gap below the link grid seats it on the facts' hairline.
3. **Measured, not guessed.** With the eight places, the longest run of scroll with no robot on screen is:

   | Viewport | Motion | Longest run with no robot |
   | --- | --- | --- |
   | 390 × 844 | on | 88 px |
   | 1280 × 800 | on | 0 px |
   | 360 × 740 | on | 196 px |
   | 390 × 844 | reduced | 304 px |

   The 360 × 740 phone has a shorter screen. With reduced motion the demo's two chats stack into a 1,900 px window, and only the traj chat header breaks it.
4. **They hold still.** The new poses do not animate, so the page's motion is still ADR 0026's three: the climb, the rock and the bob. The whole set of eight is about 90 KB of WebP. The images below the first view load lazily, and none adds HTML, CSS or Program JavaScript to the budget beyond its tag and placement ([ADR 0005](./0005-page-weight-and-web-font-budget.md)).

## Considered Options

- **A sticky robot that follows the visitor down the page.** Rejected. The owner ruled out a floating robot, and it would sit over the copy on a phone.
- **Three places, as first asked.** Rejected. Three cannot close the stretch from the Features cards through the footer without leaving most of a screen bare.
- **A second robot inside the demo for reduced motion.** Rejected for now. The stacked chats have no free space that does not cover a message, and the visitors who see that layout asked for less on the page, not more.
