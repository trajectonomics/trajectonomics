/** TEST-ONLY builders for buying and selling an asset (ADR 0021). */
import type { AccountId, ContributionFlow, Derive, MinorUnits, WithdrawalFlow } from "../types"
import type { FlowOptions } from "./test-flows"

function layout(id: string, options: FlowOptions) {
	return {
		id,
		frequency: options.frequency ?? "once",
		start: options.start ?? "2026-01-01",
		...(options.end === undefined ? {} : { end: options.end }),
		...(options.startAt === undefined ? {} : { startAt: options.startAt }),
		...(options.endAt === undefined ? {} : { endAt: options.endAt }),
	} as const
}

/** A Contribution into an asset that must be paid, whatever the day's cash. */
export function purchase(
	id: string,
	target: AccountId,
	amount: MinorUnits,
	options: FlowOptions = {},
): ContributionFlow {
	const fixed = { amount, growth: options.growth ?? { bps: 0 } }
	const label = options.label === undefined ? {} : { label: options.label }
	return {
		...layout(id, options),
		kind: "contribution",
		target,
		funding: "obligation",
		...label,
		...fixed,
	}
}

/** A withdrawal from `source`: a sale when `source` is an asset, a loan draw when it is a liability. */
export function withdrawal(
	id: string,
	source: AccountId,
	amount: MinorUnits,
	options: FlowOptions = {},
): WithdrawalFlow {
	const growth = options.growth ?? { bps: 0 }
	return { ...layout(id, options), kind: "withdrawal", source, amount, growth }
}

/** The whole value of `account` on the Landed date, read before anything lands (ADR 0020). */
export const WHOLE_VALUE = (account: AccountId): Derive => ({
	measures: [{ id: "value", op: "account", account }],
	result: "value",
})

/** A sale of everything `source` holds on each Landed date. */
export function saleOfAll(
	id: string,
	source: AccountId,
	options: FlowOptions = {},
): WithdrawalFlow {
	return { ...layout(id, options), kind: "withdrawal", source, derive: WHOLE_VALUE(source) }
}
