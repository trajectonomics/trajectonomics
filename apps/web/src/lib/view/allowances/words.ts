import type { AllowanceRow } from "../../contract"

/**
 * Why one allowance stopped taking more, in plain words. The CLI's `noSaving` covers two causes it cannot tell
 * apart, the allowance's cap and a step that saves nothing more, so one sentence says both (cli ADR-0061).
 */
export const STOP_WORDS: Readonly<Record<AllowanceRow["stoppedBy"], string>> = {
	noSaving: "No more is saved: the cap is reached or the tax stops falling.",
	belowMinSaving: "One more step would save less than your limit.",
	budget: "The yearly budget is used.",
}

/** What the page says of SSF in place of a suggestion (tax ADR 0007). */
export const SSF_WORDS = "SSF purchases are no longer deductible from 2025."

/** The sentence under the page: the figures are one plan's own rules, and no fund's holding rules are checked. */
export const ESTIMATE_NOTE =
	"These figures are estimates from this plan's own tax rules, not tax advice."

/** The line about the order: it decides which fund holds the money, not how much tax falls. */
export const ORDER_NOTE =
	"The order decides which fund holds the money, not how much tax falls. Each fund has its own holding rules to check before buying."
