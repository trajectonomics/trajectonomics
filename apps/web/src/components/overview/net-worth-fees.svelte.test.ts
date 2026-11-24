import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { type Snapshot, snapshot as snapshotSchema } from "../../lib/contract"
import { overviewView } from "../../lib/view/overview/view"
import NetWorthCard from "./NetWorthCard.svelte"

const DEMO: Snapshot = snapshotSchema.parse(
	JSON.parse(await Bun.file(`${import.meta.dir}/../../../public/demo/snapshot.json`).text()),
)

/** The Demo with its primary Scenario's projection stating `fees` as the plan's fees over the horizon. */
function withFees(fees: string | undefined): Snapshot {
	const name = DEMO.params.compare?.a ?? DEMO.params.scenarios[0] ?? ""
	const read = DEMO.reads.projections[name]
	if (read === undefined || !read.ok) throw new Error("the Demo has no projection")
	const data = { ...read.data, ...(fees === undefined ? {} : { lifetimeFees: fees }) }
	return {
		...DEMO,
		reads: { ...DEMO.reads, projections: { ...DEMO.reads.projections, [name]: { ...read, data } } },
	}
}

describe("Home's Net worth card states the fees over the plan", () => {
	test("says 'Fees over the plan' with the run's own figure when it is above zero", () => {
		const view = overviewView(withFees("1514.01"))
		const { body } = render(NetWorthCard, { props: { netWorth: view.netWorth } })
		expect(body).toContain("Fees over the plan")
		expect(body).toContain("1,514.01")
	})

	test("says nothing when the run states none or zero", () => {
		for (const fees of [undefined, "0.00"]) {
			const view = overviewView(withFees(fees))
			expect(render(NetWorthCard, { props: { netWorth: view.netWorth } }).body).not.toContain(
				"Fees over the plan",
			)
		}
	})
})
