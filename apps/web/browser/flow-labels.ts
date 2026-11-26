import type { Page } from "@playwright/test"

/** A Cash flow diagram's label that is wider than its room: 24 Japanese characters. */
export const JAPANESE = "家賃と生活費と教育費と医療費と交際費の合計額です"
/** 80 wide Latin capitals, one word, which only a conservative width can fit. */
export const WIDE = "W".repeat(80)
/** Ten family emoji in one sequence: each is a grapheme the fitters must never split. */
export const FAMILY = "👨‍👩‍👧‍👦".repeat(10)
/** A twin label: two Flows that share a name take their id, so the suffix must stay in view. */
export const TWIN = "Salary and rent from the Bangkok apartment (salary)"
/** A plain label that fits every layout whole. */
export const PLAIN = "Drawn from Bank"

interface CashflowRow {
	readonly index?: number
	readonly group?: string
	id?: string | null
	[key: string]: unknown
}

interface CashflowTable {
	readonly name: string
	readonly rows: CashflowRow[]
}

interface ProjectionRead {
	readonly ok: boolean
	readonly data?: { readonly tables: CashflowTable[] }
}

export interface FlowSnapshot {
	readonly reads: { readonly projections: Record<string, ProjectionRead> }
	[key: string]: unknown
}

/**
 * The Demo snapshot with the base plan's first year given labels that a fixed-width fitter cannot hold:
 * two income ids, and the ids of the two named spending categories. The labels are the CLI's own strings
 * for a Flow or a category, patched only here so the chart draws them without a write.
 */
export async function longFlowLabels(page: Page): Promise<FlowSnapshot> {
	const response = await page.request.get("/demo/snapshot.json")
	const snapshot = (await response.json()) as FlowSnapshot
	const projection = snapshot.reads.projections["base"]
	if (projection?.ok !== true || projection.data === undefined) {
		throw new Error("the Demo projects no base plan")
	}
	const table = projection.data.tables.find((one) => one.name === "cashflow")
	if (table === undefined) throw new Error("the Demo's base plan has no cash flow")
	const rows = table.rows.filter((row) => row.index === 0)
	const incomes = rows.filter((row) => row.group === "income")
	const [japanese, wide] = incomes
	if (japanese === undefined || wide === undefined) throw new Error("the Demo earns two incomes")
	japanese.id = JAPANESE
	wide.id = WIDE
	const categories = rows.filter((row) => row.group === "category" && row.id !== null)
	const [family, twin] = categories
	if (family === undefined || twin === undefined)
		throw new Error("the Demo spends in two categories")
	family.id = FAMILY
	twin.id = TWIN
	return snapshot
}

/** Serves the patched Snapshot where the Demo page reads it. */
export async function serveFlowLabels(page: Page, snapshot: FlowSnapshot): Promise<void> {
	await page.route(/\/snapshot\.json$/, (route) => route.fulfill({ json: snapshot }))
}
