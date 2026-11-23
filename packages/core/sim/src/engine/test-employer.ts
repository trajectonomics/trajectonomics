/** TEST-ONLY builders for an employer Contribution (ADR 0026). */
import type { AccountId, ContributionFlow, Derive, MinorUnits } from "../types"
import { contribution, derivedContribution, type FlowOptions } from "./test-flows"

/** A fixed employer Contribution: it lands in `target` outside the household's cash. */
export function employerShare(
	id: string,
	target: AccountId,
	amount: MinorUnits,
	options: FlowOptions = {},
): ContributionFlow {
	return { ...contribution(id, target, amount, options), funding: "employer" }
}

/** `num / den` of another Flow's planned gross amount, rounded half up (ADR 0020). */
export function shareOf(flow: string, num: number, den: number): Derive {
	return {
		measures: [
			{ id: "source", op: "flow", flow },
			{ id: "share", op: "scale", of: "source", num, den, rounding: "halfUp" },
		],
		result: "share",
	}
}

/** An employer Contribution whose amount is a share of a salary Flow's gross on each Landed date. */
export function derivedEmployerShare(
	id: string,
	target: AccountId,
	derive: Derive,
	options: FlowOptions = {},
): ContributionFlow {
	return { ...derivedContribution(id, target, derive, options), funding: "employer" }
}
