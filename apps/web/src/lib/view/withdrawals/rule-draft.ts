/** The text of a spending rule's own fields, which the Withdrawals form shows (cli ADR 0063). Pure. */
import { formatBps } from "../../format/bps"
import type { BoundDraft, WithdrawalDraft } from "./draft"
import type { RuleBound, SpendingRule } from "./rule"

const NO_BOUND: BoundDraft = { amount: "", growth: "", rate: "" }

/** The text of a bound the rule holds, or the empty one. */
function boundOf(bound: RuleBound | undefined): BoundDraft {
	if (bound === undefined) return { ...NO_BOUND }
	const fixed = bound.growth !== "inflation"
	return {
		amount: bound.amount,
		growth: fixed ? "fixed" : "inflation",
		rate: bound.growth === "inflation" ? "" : formatBps(bound.growth.bps),
	}
}

/** The text of the rule's own fields: all empty when the Flow has none. */
export function ruleDraftOf(
	rule: SpendingRule | null,
): Omit<
	WithdrawalDraft,
	"how" | "frequency" | "amount" | "portfolio" | "startMode" | "milestone" | "start" | "stops"
> {
	return {
		rate: rule?.rateBps ?? "",
		steps: (rule?.steps ?? []).map((step) => ({ from: step.from, rate: step.bps })),
		floor: boundOf(rule?.floor),
		ceiling: boundOf(rule?.ceiling),
		upper: { band: rule?.upper?.bps ?? "", move: rule?.upper?.adjustBps ?? "" },
		lower: { band: rule?.lower?.bps ?? "", move: rule?.lower?.adjustBps ?? "" },
		rounding: rule?.rounding ?? "",
	}
}
