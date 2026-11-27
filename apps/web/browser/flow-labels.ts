import type { Page } from "@playwright/test"
import { patchFlowLabels } from "./flow-label-patch"
import type { FlowSnapshot } from "./flow-label-snapshot"

export type { FlowSnapshot } from "./flow-label-snapshot"

/**
 * The Demo snapshot with the review's labels on Cash flow's bands (see `patchFlowLabels`). The labels are
 * patched here so the chart draws them without a write.
 */
export async function longFlowLabels(page: Page): Promise<FlowSnapshot> {
	const response = await page.request.get("/demo/snapshot.json")
	const snapshot = (await response.json()) as FlowSnapshot
	const projection = snapshot.reads.projections["base"]
	if (projection?.ok !== true || projection.data === undefined) {
		throw new Error("the Demo projects no base plan")
	}
	const document = snapshot.reads.documents["base"]?.data?.scenario.document
	if (document === undefined) throw new Error("the Demo reads no base plan")
	const table = projection.data.tables.find((one) => one.name === "cashflow")
	if (table === undefined) throw new Error("the Demo's base plan has no cash flow")
	const year = { all: table.rows, rows: table.rows.filter((row) => row.index === 0) }
	patchFlowLabels(document, year)
	return snapshot
}

/** Serves the patched Snapshot where the Demo page reads it. */
export async function serveFlowLabels(page: Page, snapshot: FlowSnapshot): Promise<void> {
	await page.route(/\/snapshot\.json$/, (route) => route.fulfill({ json: snapshot }))
}
