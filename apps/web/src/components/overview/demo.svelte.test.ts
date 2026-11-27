import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { demoSnapshotText } from "../../../scripts/demo-snapshot"
import { type Snapshot, snapshot as snapshotSchema } from "../../lib/contract"
import { formatMoney } from "../../lib/format"
import { overviewView } from "../../lib/view/overview/view"
import OverviewGrid from "./OverviewGrid.svelte"

const DEMO_TEXT = await demoSnapshotText()
const DEMO: Snapshot = snapshotSchema.parse(JSON.parse(DEMO_TEXT))

// The figures are read from the same Snapshot the page renders, so the test survives a rebuilt Demo.
describe("the pages, rendered from the Demo snapshot", () => {
	test("the Overview shows the CLI's net worth total", () => {
		const { body } = render(OverviewGrid, { props: { view: overviewView(DEMO) } })
		const total = DEMO.reads.netWorth.ok ? DEMO.reads.netWorth.data.totals?.[0] : undefined
		expect(total).toBeDefined()
		expect(body).toContain(formatMoney(total?.amount ?? ""))
		expect(body).not.toContain("undefined")
		expect(body).not.toContain("NaN")
	})
})
