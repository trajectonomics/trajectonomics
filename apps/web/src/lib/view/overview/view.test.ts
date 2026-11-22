import { describe, expect, test } from "bun:test"
import { type Snapshot, snapshot as snapshotSchema } from "../../contract"
import { overviewView } from "./view"

const DEMO_TEXT = await Bun.file(`${import.meta.dir}/../../../../public/demo/snapshot.json`).text()
const DEMO: Snapshot = snapshotSchema.parse(JSON.parse(DEMO_TEXT))

describe("overviewView", () => {
	test("reads the primary Scenario: the first side of the comparison", () => {
		const view = overviewView(DEMO)
		const primary = DEMO.params.compare?.a
		expect(view.fi).toMatchObject({ status: "ready", name: primary })
		expect(view.projection).toMatchObject({ status: "ready", name: primary })
		expect(view.tax).toMatchObject({ status: "ready", name: primary })
	})

	test("gives the net worth card one sparkline point per month-end read that succeeded", () => {
		const view = overviewView(DEMO)
		expect(view.netWorth.ok).toBe(true)
		const expected = DEMO.reads.netWorthHistory.filter((read) => read.ok).length
		expect(view.netWorth.ok && view.netWorth.data.sparkline).toHaveLength(expected)
	})

	test("shows at most three largest P&L rows, drawn from the CLI's rows", () => {
		const view = overviewView(DEMO)
		expect(view.pnl.ok).toBe(true)
		if (!view.pnl.ok) return
		const rows = DEMO.reads.pnl.ok ? DEMO.reads.pnl.data.rows : []
		expect(view.pnl.data.largest).toHaveLength(Math.min(3, rows.length))
		for (const item of view.pnl.data.largest) expect(rows).toContainEqual(item)
	})

	test("names no Scenario when the Snapshot has none", () => {
		const bare: Snapshot = { ...DEMO, params: { ...DEMO.params, scenarios: [], compare: null } }
		expect(overviewView(bare).fi).toEqual({ status: "none" })
	})
})
