/**
 * The FI method in three sentences, the text `traj fi --help`, `traj projection run --help` and
 * the `fi` result's `definition.explanation` all state (ADR-0008). Each sentence is pinned to the
 * sim core's code; the code path for each claim is cited where the claim is made in the PR.
 */
export const FI_METHOD: string = [
	"From the FI month on, every earned income stream stops; planned expenses and passive income keep running as the Scenario states them.",
	"Tax keeps running: each Tax Levy still tallies the income that remains and settles on its own dates, so tax is charged on what is left after earned income stops.",
	"The 25x figure is a reference beside a reachable date, never the decision: it compares the unlocked assets in the FI month with 25 times the planned expenses of the next twelve months, and when met is false those assets are below that level, which says the portfolio is short of the rule of thumb, not that FI is out of reach.",
].join(" ")

/** Why the horizon is a choice: survival means the money lasts until it, so it moves the FI date. */
export const FI_HORIZON: string =
	"The horizon is the last date the plan has to fund, for example the date the person turns 95: FI means the money lasts until it, so a later horizon can move the FI date later."

/** The note a result carries beside its horizon, so a reader sees which date the answer was for. */
export function horizonNote(horizon: string): string {
	return `The FI answer is for a horizon of ${horizon}: the money has to last until then, and a later horizon can move the FI date later.`
}
