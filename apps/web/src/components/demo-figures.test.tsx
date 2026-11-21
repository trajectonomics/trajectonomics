import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"

import { type Snapshot, snapshot as snapshotSchema } from "../lib/contract"
import { formatMoney } from "../lib/format"
import { overviewView } from "../lib/view/overview/view"
import { OverviewGrid } from "./overview/OverviewGrid"

const DEMO_TEXT = await Bun.file(`${import.meta.dir}/../../public/demo/snapshot.json`).text()
const DEMO: Snapshot = snapshotSchema.parse(JSON.parse(DEMO_TEXT))

// The figures are read from the same Snapshot the page renders, so the test survives a rebuilt Demo.
describe("the pages, rendered from the Demo snapshot", () => {
	test("the Overview shows the CLI's net worth total and the primary Scenario's name", () => {
		const html = renderToStaticMarkup(<OverviewGrid view={overviewView(DEMO)} />)
		const total = DEMO.reads.netWorth.ok ? DEMO.reads.netWorth.data.totals[0] : undefined
		expect(total).toBeDefined()
		expect(html).toContain(formatMoney(total?.amount ?? ""))
		expect(html).toContain(`Scenario ${DEMO.params.compare?.a ?? DEMO.params.scenarios[0]}`)
		expect(html).not.toContain("undefined")
		expect(html).not.toContain("NaN")
	})
})
