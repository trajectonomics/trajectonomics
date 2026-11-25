import { growthYears } from "../calendar/arith"
import { countedDays } from "../calendar/counted"
import { isSafeInteger, overflow } from "../engine/overflow"
import type {
	AccountId,
	Estate,
	EstateLine,
	EstateStatement,
	ProjectionProblem,
	ProjectionRow,
	Scenario,
	Timeline,
} from "../types"
import { costAmount, type Footing, giftAmounts, type Worth } from "./line"
import { realFigures } from "./real"

export type StatementOutcome =
	| { readonly statement: EstateStatement }
	| { readonly problem: ProjectionProblem }

/** The row's Accounts by kind: assets into `gross` and each value, liabilities into `debts`. */
export function worthOf(row: ProjectionRow, liabilities: ReadonlySet<AccountId>): Worth {
	const byAccount = new Map<AccountId, bigint>()
	let gross = 0n
	let debts = 0n
	for (const balance of row.balances) {
		const amount = BigInt(balance.amount)
		if (liabilities.has(balance.account)) debts += amount
		else {
			gross += amount
			byAccount.set(balance.account, amount)
		}
	}
	return { gross, debts, byAccount }
}

function lines(block: readonly { readonly id: string }[], amounts: readonly bigint[]) {
	return block.map((line, index): EstateLine => ({ id: line.id, amount: Number(amounts[index]!) }))
}

/** One row's Estate statement; a figure that leaves the safe integers is `VALUE_OVERFLOW` on the date. */
export function estateStatement(
	row: ProjectionRow,
	estate: Estate | undefined,
	scenario: Scenario,
	timeline: Timeline,
	liabilities: ReadonlySet<AccountId>,
): StatementOutcome {
	const inflation = scenario.economy.inflation
	const footing: Footing = { years: growthYears(timeline.start, row.date), inflation }
	const worth = worthOf(row, liabilities)
	const costs = (estate?.costs ?? []).map((cost) => costAmount(cost, worth, footing))
	const costsTotal = costs.reduce((sum, cost) => sum + cost, 0n)
	const net = worth.gross - worth.debts - costsTotal
	const gifts = giftAmounts(estate?.gifts ?? [], net, footing)
	const giftsTotal = gifts.reduce((sum, gift) => sum + gift, 0n)
	const toHeirs = (net < 0n ? 0n : net) - giftsTotal
	const days = countedDays(timeline.start, row.date)
	const real = realFigures(BigInt(row.realNetWorth), costs, gifts, toHeirs, inflation, days)
	const figures = [
		worth.gross,
		worth.debts,
		costsTotal,
		net,
		giftsTotal,
		toHeirs,
		real.net,
		real.toHeirs,
		...costs,
		...gifts,
	]
	if (!figures.every(isSafeInteger)) return { problem: overflow(row.date) }
	return {
		statement: {
			date: row.date,
			gross: Number(worth.gross),
			debts: Number(worth.debts),
			costs: lines(estate?.costs ?? [], costs),
			costsTotal: Number(costsTotal),
			net: Number(net),
			gifts: lines(estate?.gifts ?? [], gifts),
			giftsTotal: Number(giftsTotal),
			toHeirs: Number(toHeirs),
			real: { net: Number(real.net), toHeirs: Number(real.toHeirs) },
		},
	}
}
