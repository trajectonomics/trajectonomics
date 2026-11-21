import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"

import { type Snapshot, snapshot as snapshotSchema } from "../lib/contract"
import { formatMoney } from "../lib/format"
import { netWorthPageView } from "../lib/view/net-worth/page"
import { overviewView } from "../lib/view/overview/view"
import { NetWorthContent } from "./net-worth/NetWorthContent"
import { OverviewGrid } from "./overview/OverviewGrid"

const DEMO_TEXT = await Bun.file(`${import.meta.dir}/../../public/demo/snapshot.json`).text()
const DEMO: Snapshot = snapshotSchema.parse(JSON.parse(DEMO_TEXT))

// The figures are read from the same Snapshot the page renders, so the test survives a rebuilt Demo.
describe("the pages, rendered from the Demo snapshot", () => {
	const net = DEMO.reads.netWorth.ok ? DEMO.reads.netWorth.data : null

	test("the Overview shows the CLI's net worth total and the primary Scenario's name", () => {
		const html = renderToStaticMarkup(<OverviewGrid view={overviewView(DEMO)} />)
		const total = net?.totals[0]
		expect(total).toBeDefined()
		expect(html).toContain(formatMoney(total?.amount ?? ""))
		expect(html).toContain(`Scenario ${DEMO.params.compare?.a ?? DEMO.params.scenarios[0]}`)
		expect(html).not.toContain("undefined")
		expect(html).not.toContain("NaN")
	})

	test("the Net worth page lists every account row of the report by its name", () => {
		const html = renderToStaticMarkup(<NetWorthContent view={netWorthPageView(DEMO)} />)
		for (const item of net?.rows ?? []) {
			expect(html).toContain(item.account.name)
			expect(html).toContain(formatMoney(item.amount))
		}
		expect(html).not.toContain("undefined")
	})
})
