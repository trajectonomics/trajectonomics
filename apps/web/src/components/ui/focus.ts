/** The one mark a focus point answers with, shared by the Overview and every page, so it never moves ([#704](https://github.com/trajectonomics/trajectonomics/pull/825), [#707](https://github.com/trajectonomics/trajectonomics/issues/707)). */

/** How loud a focus point's answer is. Only "warn" draws it in the accent colour, for bad news. */
export type FocusTone = "plain" | "warn"

/**
 * The answer's size and weight. Exactly one element on a page wears it: `FocusAnswer`, or the Overview's
 * label, which is why the class string is here rather than in either of them.
 */
export const ANSWER_TEXT =
	"font-bold tracking-tight leading-none text-[clamp(1.875rem,4vw,2.75rem)]"

/** The one solid action a page may draw. Every other control is an outline button or a link. */
export const PRIMARY_ACTION =
	"inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
