import { type ProjectionRun, scenarioDocument } from "../../contract"
import { type ItemNames, itemNames } from "../item-names"
import { ANNUAL_ROWS, projectionRunFixture } from "../projection/fixtures.test-support"

/** A run whose cash flow has one expense line per Flow id, each in the first year, so a chart can name them. */
export function withExpenseFlows(flowIds: readonly string[]): ProjectionRun {
	return projectionRunFixture({
		tables: [
			{ name: "annual", count: ANNUAL_ROWS.length, rows: [...ANNUAL_ROWS] },
			{
				name: "cashflow",
				count: flowIds.length,
				rows: flowIds.map((id) => ({
					index: 0,
					from: "2026-10-31",
					to: "2027-10-30",
					group: "expense" as const,
					id,
					account: null,
					category: null,
					amount: "100.00",
				})),
			},
		],
	})
}

/** The names of a plan whose document states the labels `flows` carries, and no others. */
export function planNames(flows: readonly { id: string; displayLabel?: string }[]): ItemNames {
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
	return itemNames(new Map(), null, document)
}
