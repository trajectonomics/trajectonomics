import { type ProjectionRun, scenarioDocument } from "../../contract"
import type { AccountNames } from "../account-names"
import { type ItemNames, itemNames } from "../item-names"
import { ANNUAL_ROWS, projectionRunFixture } from "../projection/fixtures.test-support"

/** One cash-flow line of a fixture, in the first year, so a chart can name it. */
interface FixtureLine {
	readonly group: "expense" | "category" | "contribution" | "withdrawal"
	readonly id: string | null
	readonly account?: string | null
	readonly category?: string | null
}

/** A run whose cash flow has the lines given, each in the first year, so a chart can name them. */
export function withCashLines(lines: readonly FixtureLine[]): ProjectionRun {
	return projectionRunFixture({
		tables: [
			{ name: "annual", count: ANNUAL_ROWS.length, rows: [...ANNUAL_ROWS] },
			{
				name: "cashflow",
				count: lines.length,
				rows: lines.map((line) => ({
					index: 0,
					from: "2026-10-31",
					to: "2027-10-30",
					group: line.group,
					id: line.id,
					account: line.account ?? null,
					category: line.category ?? null,
					amount: "100.00",
				})),
			},
		],
	})
}

/** A run whose cash flow has one expense line per Flow id, each in the first year, so a chart can name them. */
export function withExpenseFlows(flowIds: readonly string[]): ProjectionRun {
	return withCashLines(flowIds.map((id) => ({ group: "expense" as const, id })))
}

/** A run with each of the given Account ids valued once, so a chart can name them. */
export function withAccountValues(accounts: readonly string[]): ProjectionRun {
	return projectionRunFixture({
		tables: [
			{ name: "annual", count: ANNUAL_ROWS.length, rows: [...ANNUAL_ROWS] },
			{
				name: "balances",
				count: accounts.length,
				rows: accounts.map((account) => ({
					date: "2027-10-30",
					account,
					amount: "500000.00",
					real: "480000.00",
				})),
			},
		],
	})
}

/** The names of a plan whose document states the labels `flows` carries, and no others. */
export function planNames(
	flows: readonly { id: string; displayLabel?: string }[],
	accounts: AccountNames = new Map(),
): ItemNames {
	const document = scenarioDocument.parse({
		currency: "THB",
		accounts: [],
		flows: flows.map(({ id, displayLabel }) => ({
			id,
			kind: "income",
			frequency: "monthly",
			start: "2026-01-01",
			...(displayLabel === undefined ? {} : { displayLabel }),
		})),
	})
	return itemNames(accounts, null, document)
}
