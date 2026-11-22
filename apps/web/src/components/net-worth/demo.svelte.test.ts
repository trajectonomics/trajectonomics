import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { type Snapshot, snapshot as snapshotSchema } from "../../lib/contract"
import { formatMoney } from "../../lib/format"
import { netWorthPageView } from "../../lib/view/net-worth/page"
import NetWorthContent from "./NetWorthContent.svelte"

const DEMO_TEXT = await Bun.file(`${import.meta.dir}/../../../public/demo/snapshot.json`).text()
const DEMO: Snapshot = snapshotSchema.parse(JSON.parse(DEMO_TEXT))

// The figures are read from the same Snapshot the page renders, so the test survives a rebuilt Demo.
describe("the Net worth page, rendered from the Demo snapshot", () => {
	test("lists every account row of the report by its name and its CLI amount", () => {
		const net = DEMO.reads.netWorth.ok ? DEMO.reads.netWorth.data : null
		const { body } = render(NetWorthContent, { props: { view: netWorthPageView(DEMO) } })
		for (const item of net?.rows ?? []) {
			expect(body).toContain(item.account.name)
			expect(body).toContain(formatMoney(item.amount))
		}
		expect(body).not.toContain("undefined")
		expect(body).not.toContain("NaN")
	})
})
