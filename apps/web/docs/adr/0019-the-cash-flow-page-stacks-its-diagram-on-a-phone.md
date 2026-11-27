---
status: accepted
---

# The Cash flow page stacks its diagram on a phone

The Cash flow page's flow diagram keeps a 640px minimum width and scrolls sideways inside its own box. At 360px the uses (tax, spending, saving, left over, unmet) and their labels were off-screen until the box was scrolled. A screen too narrow for the diagram needs a layout that shows every band without a sideways scroll.

## Decision

- **Below the `md` breakpoint (768px) the page draws the stacked layout, and from `md` up the wide diagram, unchanged.** `md` is the first width at which the wide diagram fits without scrolling (the page has no sidebar below `lg` and a 240px one from it, and the 640px diagram fits either way). Both are in the page, and CSS (`hidden md:block`, `md:hidden`) shows one of them, so the choice needs no script, no `matchMedia` and no flash on the first render. The one hidden table for a screen reader is shared, as the picked band is.
- **Sources above and uses below, as two lists of bars on one scale, not the diagram rotated.** A rotated diagram would still have to put a label beside every band, and the ribbons of a top-to-bottom diagram are narrow slivers on a phone that a finger cannot pick. A list gives each band a line of its own for its name and its amount, with the bar under it, and the bars of both lists share the scale of the taller list, so a bar is as long, in share, as the same band is tall on the wide diagram. The cash node and the ribbons are not drawn: the table below states what each band did.
- **Every band of the wide diagram is a row**: income, payouts, the employer's money (in both lists, as on the wide diagram), withdrawals, money drawn, a refund, unmet money, tax, spending, saving and left over. A zero band draws nothing and a list with no band has no heading, as on the wide diagram.
- **`src/lib/chart/flow-stack.ts` is pure**, beside `flow.ts`: bands in, geometry out, no DOM. `layoutStack` takes the same `FlowInput` as `layoutFlow`, so the page states the bands once. The layout is 320 units wide, which is the width of a 360px phone less the page's gutters, and the SVG scales to its box, so a row's text is at its true size on a phone and no wider than 28rem on a screen between a phone and `md`. The amount of a band is the CLI's string and the layout adds no figure; a bar's length is placed with `toChartNumber`, for the mark only ([ADR 0002](0002-the-cli-is-the-only-source-of-figures.md)).
- **A label stays inside its box.** A row's name and amount share one line, the amount at the right and never shortened, and the name is shortened with an ellipsis to the room the amount leaves (`stackName`). The wide diagram's name is clipped to its room in the same way. A twin's `(id)` may be cut with a long name on a diagram, because the band's `aria-label` and the table keep the whole label, so the twins still read apart there (#667). The full name stays in the band's label and the table.
- **One always-drawn probe measures both layouts.** The page places a zero-size `<svg>` with a hidden `text-xs` `<text>` outside both breakpoint wrappers, so it is drawn whichever layout CSS shows. Both diagrams fit their names through it with `getComputedTextLength`, at the size the SVG draws, including the browser's minimum font and a user stylesheet's letter and word spacing (#679, #718). A hidden layout is therefore fitted at the drawn size too, which is what printing from a narrow window needs: print lays the page out on A4 and shows the wide diagram, whose names were already fitted while it was hidden. The server render has no probe, so it falls back to the grapheme estimate; hydration measures again. The probe's hidden `1em` box is watched with an attachment that disconnects on teardown, and the widths are cleared only when that box really changes size, so a year change neither clears them nor creates an observer.
- **A bar is a control, as a ribbon is**: a click, or Enter or Space, picks the band's row in the table, and the same pick works in both layouts.

## Considered Options

- **The diagram rotated to flow top to bottom.** Rejected, as above: labels and finger targets are the problem, not the axis.
- **A smaller wide diagram.** Rejected: at 360px the text of an 800-unit diagram is a third of its size.
- **Showing one layout by script (`matchMedia`).** Rejected: the server-rendered page would choose without knowing the width, and a switch would redraw.
- **Bars scaled to each list.** Rejected: a lone 1,000.00 of tax would look as large as a 120,000.00 salary.
