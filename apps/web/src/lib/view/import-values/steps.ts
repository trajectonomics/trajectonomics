import type { Layout } from "./types"

/** The steps of the wizard, in order. The last screen, what was recorded, is not a step. */
export const STEPS = ["Load", "Match", "Review"] as const
export type StepName = "load" | "match" | "review" | "done"

/** "Step 2 of 3: Match", or empty on the last screen. */
export function stepLine(step: StepName): string {
	const at = ["load", "match", "review"].indexOf(step)
	return at === -1 ? "" : `Step ${at + 1} of ${STEPS.length}: ${STEPS[at]}`
}

/** The three layouts, as the choice shows them. */
export const LAYOUT_OPTIONS: readonly { value: Layout; label: string }[] = [
	{ value: "dates-down", label: "Dates down" },
	{ value: "accounts-down", label: "Accounts down" },
	{ value: "per-value", label: "One row per value" },
]

const HINTS: Record<Layout, string> = {
	"dates-down":
		"The first column holds the dates and each other column is one account, named in the first row.",
	"accounts-down":
		"The first column holds the account names and each other column is one date, written in the first row.",
	"per-value":
		"One row per value, with the columns date, account and value, named in the first row.",
}

/** What the chosen layout expects of the table. */
export function layoutHint(layout: Layout): string {
	return HINTS[layout]
}
