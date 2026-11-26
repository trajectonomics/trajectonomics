import { describe, expect, it } from "bun:test"
import { type ProjectionRun, type Snapshot, snapshot } from "../src/lib/contract"
import { seriesById } from "../src/lib/view/charts/resolve"
import { parseCharts, serializeCharts } from "../src/lib/view/charts/stored"
import { type ChartDef, MAX_SERIES } from "../src/lib/view/charts/types"
import { chartView } from "../src/lib/view/charts/view"
import { type ItemNames, snapshotItemNames } from "../src/lib/view/item-names"
import { generateDemo } from "./demo-generate"
import { demoSnapshotText } from "./demo-snapshot"

// A Demo generation gives the same bytes (#477, cli ADR 0074), so a chart a visitor saved against one
// deploy still draws on the next. Each generation compiles its own demo `traj` from the CLI's source, so
// the checks cover the whole generator: the fixed clock and counted ids the CLI writes, and the content
// hashes that cover those ids. They stay in `test:scripts`, which CI runs after it has built the CLI and
// the Demo, so there is no job of their own. The file the `demo` task wrote is a third generation.

const sha256 = (text: string) => new Bun.CryptoHasher("sha256").update(text).digest("hex")
const UUID_V7 = /[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/

/** Generates the Demo and returns its text, or fails the test with the generator's message. */
async function generated(): Promise<string> {
	const run = await generateDemo()
	if (!run.ok) throw new Error(run.message)
	return run.text
}

// Both generations are made once and read by every test, because each compiles a binary and takes about
// half a minute.
const regenerations = Promise.all([generated(), generated()])

describe("the Demo snapshot's bytes", () => {
	it("are equal in two generations, and equal to the file the demo task wrote", async () => {
		const [first, second] = await regenerations
		expect(sha256(second)).toBe(sha256(first))
		expect(second).toBe(first)
		expect(sha256(await demoSnapshotText())).toBe(sha256(first))
	}, 180_000)
})

/** The base plan's projection and its item names, as the page resolves a series. */
function planOf(text: string): { run: ProjectionRun; names: ItemNames } {
	const parsed: Snapshot = snapshot.parse(JSON.parse(text))
	const base = parsed.reads.projections["base"]
	if (base?.ok !== true) throw new Error("the Demo snapshot has no base plan")
	return { run: base.data, names: snapshotItemNames(parsed, "base") }
}

/** A chart of the Account and cash-flow series, which name a ledger id, as a visitor would save it. */
function savedChart(ids: Iterable<string>): ChartDef {
	const all = [...ids]
	const of = (family: string) => all.filter((id) => id.startsWith(family)).slice(0, MAX_SERIES / 2)
	return { id: "saved", name: "Saved", kind: "line", series: [...of("account:"), ...of("cash:")] }
}

describe("a saved chart across a Demo regeneration", () => {
	it("keeps every series key, so none is missing from the next generation", async () => {
		const [regenerated] = await regenerations
		const before = planOf(await demoSnapshotText())
		const after = planOf(regenerated)
		const known = seriesById(before.run, before.names)
		const chart = savedChart(known.keys())
		// The ids that matter are the ledger's: an Account's UUIDv7, and a cash-flow line keyed by one.
		expect(chart.series.some((id) => UUID_V7.test(id) && id.startsWith("account:"))).toBe(true)
		expect(chart.series.some((id) => id.startsWith("cash:"))).toBe(true)
		// A chart is stored as text in the browser, so the keys go through that text and back.
		const stored = parseCharts(serializeCharts([chart]))
		if (!stored.ok) throw new Error(stored.reason)
		const view = chartView(
			stored.charts[0] ?? chart,
			seriesById(after.run, after.names),
			new Map(),
			"nominal",
		)
		expect(view.missing).toEqual([])
		expect(new Set(seriesById(after.run, after.names).keys())).toEqual(new Set(known.keys()))
	}, 180_000)

	it("would lose them if the ids changed, which is what the fixed source prevents", async () => {
		const text = await demoSnapshotText()
		const before = planOf(text)
		const chart = savedChart(seriesById(before.run, before.names).keys())
		const accountId = chart.series.find((id) => id.startsWith("account:"))?.slice("account:".length)
		if (accountId === undefined) throw new Error("the saved chart holds no Account series")
		const renumbered = planOf(text.replaceAll(accountId, "ffffffff-ffff-7fff-bfff-ffffffffffff"))
		const view = chartView(
			chart,
			seriesById(renumbered.run, renumbered.names),
			new Map(),
			"nominal",
		)
		expect(view.missing.length).toBeGreaterThan(0)
	}, 180_000)
})
