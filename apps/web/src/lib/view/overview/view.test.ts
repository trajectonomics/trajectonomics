import { describe, expect, test } from "bun:test"
import { demoSnapshotText } from "../../../../scripts/demo-snapshot"
import { type Snapshot, snapshot as snapshotSchema } from "../../contract"
import { overviewView } from "./view"

const DEMO_TEXT = await demoSnapshotText()
const DEMO: Snapshot = snapshotSchema.parse(JSON.parse(DEMO_TEXT))

describe("overviewView", () => {
	test("reads the primary Scenario: the first side of the comparison", () => {
		const view = overviewView(DEMO)
		const primary = DEMO.params.compare?.a
		expect(view.projection).toMatchObject({ status: "ready", name: primary })
		expect(view.tax).toMatchObject({ status: "ready", name: primary })
	})

	test("reads the net worth total and the CLI's as-of date", () => {
		const view = overviewView(DEMO)
		expect(view.netWorth.ok).toBe(true)
		if (!view.netWorth.ok) return
		if (!DEMO.reads.netWorth.ok) throw new Error("the Demo reads its net worth")
		expect(view.netWorth.data.totals).toEqual(DEMO.reads.netWorth.data.totals ?? [])
		expect(view.netWorth.data.asOf).toContain("2026")
	})

	test("names a departed Return on the allowances card through the plan's stored claimsHolder", () => {
		const changed = structuredClone(DEMO)
		const read = changed.reads.documents["separate"]
		if (read?.ok !== true) throw new Error("the Demo has no separate document")
		read.data.scenario.household = {
			schemaVersion: 2,
			people: [
				{ id: "ann", role: "holder", born: "1990-06", lifeExpectancy: 90 },
				{ id: "bob", role: "partner", born: "1992-02", lifeExpectancy: 88 },
			],
			anchors: [],
			owners: [],
		}
		read.data.scenario.tax = {
			tax: "th-2026",
			filingStatus: "married_separate",
			children: 0,
			childrenAtHigherRate: 0,
			claimsHolder: "me",
		}
		const view = overviewView(changed, "separate")
		expect(view.allowances.status).toBe("ready")
		if (view.allowances.status !== "ready" || !view.allowances.read.ok) return
		const names = view.allowances.read.data?.savings.map((one) =>
			typeof one.name === "string" ? one.name : one.name?.text,
		)
		expect(names).toEqual(["The earlier holder", "Another person"])
	})

	test("names no Scenario when the Snapshot has none", () => {
		const bare: Snapshot = { ...DEMO, params: { ...DEMO.params, scenarios: [], compare: null } }
		expect(overviewView(bare).projection).toEqual({ status: "none" })
	})
})
