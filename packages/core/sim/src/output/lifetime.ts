import { addTo } from "../engine/add"
import type { DayTotals } from "../engine/occurrence"
import { isSafeInteger, overflow } from "../engine/overflow"
import type { AccountLifetime, Projection, ProjectionProblem } from "../types/projection"
import type { Declared } from "./declared"
import type { Period } from "./periods"

export interface LifetimeOutcome {
	/** `lifetimeFees` and `accountLifetimes`; both absent unless a fee or a payout is declared. */
	readonly fields: Pick<Projection, "lifetimeFees" | "accountLifetimes">
	readonly problem: ProjectionProblem | undefined
}

/** What each Account was charged or paid out on the days the roll-ups cover, summed per Account. */
function sumBy(
	totals: readonly DayTotals[],
	periods: readonly Period[],
	by: (total: DayTotals) => ReadonlyMap<string, bigint>,
): ReadonlyMap<string, bigint> {
	const from = periods[0]!.from
	const to = periods.at(-1)!.to
	const sums = new Map<string, bigint>()
	for (const total of totals.filter((day) => day.date >= from && day.date <= to)) {
		for (const [account, amount] of by(total)) addTo(sums, account, amount)
	}
	return sums
}

/**
 * Each fee and payout Account's totals over the whole horizon, and the plan's fees (ADR 0027, 0028). Read
 * from the days the roll-ups read, so the totals are the sums of the roll-up figures and nothing is walked
 * again; a Scenario with neither adds no field.
 */
export function buildLifetimes(
	totals: readonly DayTotals[],
	periods: readonly Period[],
	declared: Declared,
	order: readonly string[],
): LifetimeOutcome {
	if (declared.fees.length === 0 && declared.paying.length === 0) {
		return { fields: {}, problem: undefined }
	}
	const fees = sumBy(totals, periods, (total) => total.feesBy)
	const payouts = sumBy(totals, periods, (total) => total.payoutsBy)
	const accounts = order.filter(
		(account) => declared.fees.includes(account) || declared.paying.includes(account),
	)
	const plan = declared.fees.reduce((sum, account) => sum + (fees.get(account) ?? 0n), 0n)
	const values = [plan, ...fees.values(), ...payouts.values()]
	if (!values.every(isSafeInteger)) return { fields: {}, problem: overflow(periods.at(-1)!.to) }
	const lifetimes = accounts.map(
		(account): AccountLifetime => ({
			account,
			...(declared.fees.includes(account) ? { lifetimeFees: Number(fees.get(account) ?? 0n) } : {}),
			...(declared.paying.includes(account)
				? { lifetimePayouts: Number(payouts.get(account) ?? 0n) }
				: {}),
		}),
	)
	return {
		fields: {
			...(declared.fees.length > 0 ? { lifetimeFees: Number(plan) } : {}),
			accountLifetimes: lifetimes,
		},
		problem: undefined,
	}
}
