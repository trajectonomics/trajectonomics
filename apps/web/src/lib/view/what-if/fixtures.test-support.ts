import { type ProjectionCompare, type Snapshot, snapshot as snapshotSchema } from "../../contract"
import type { WhatIfLens } from "../../what-if/lens"

const DEMO_TEXT = await Bun.file(`${import.meta.dir}/../../../../public/demo/snapshot.json`).text()

/** The committed Demo snapshot: its `base` is the baseline, and its `retire-early` stands in for the what-if. */
export const DEMO: Snapshot = snapshotSchema.parse(JSON.parse(DEMO_TEXT))

function dataOf<T>(read: { ok: true; data: T } | { ok: false } | null | undefined): T {
	if (read === null || read === undefined || !read.ok) throw new Error("the Demo lacks this read")
	return read.data
}

/** The Demo's compare, as the CLI states it: base is side A, retire-early side B. Several deltas are null here. */
export const DEMO_COMPARE: ProjectionCompare = dataOf(DEMO.reads.compare)

/**
 * A compare in which the CLI states a change: the FI date three months earlier, net worth higher, a year's
 * delta, a Milestone moved by three months and one reached only in the what-if.
 */
export function statedCompare(): ProjectionCompare {
	const base = structuredClone(DEMO_COMPARE)
	const rows = base.tables.flatMap((table) => table.rows)
	const [first, second] = rows
	if (first === undefined || second === undefined) throw new Error("the Demo has no years")
	first.closingNetWorth = { a: "1744616.72", b: "1749616.72", delta: "5000.00" }
	second.closingNetWorth = { a: "2000000.00", b: "1990000.00", delta: null }
	second.levy = { a: "10.00", b: "20.00", delta: null }
	first.levy = { a: "89000.00", b: "88000.00", delta: "-1000.00" }
	base.deltas.fiMonths = -3
	base.deltas.runOutYears = 2
	base.deltas.netWorth = { nominal: "1200.00", real: "-300.00" }
	base.sides.b.milestones = [
		{ id: "car-paid-off", reached: true, date: "2030-10-01" },
		{ id: "net-worth-ten-million", reached: true, date: "2040-01-30" },
		{ id: "sabbatical", reached: true, date: "2041-02-01" },
	]
	base.deltas.milestones = [
		{ id: "car-paid-off", a: "2031-01-01", b: "2030-10-01", months: -3 },
		{ id: "net-worth-ten-million", a: "2040-01-30", b: "2040-01-30", months: 0 },
		{ id: "sabbatical", a: null, b: "2041-02-01", months: null },
	]
	return base
}

/** A lens on `plan` from the Demo: `retire-early`'s reads are the what-if, and the compare is the one given. */
export function demoLens(
	compare: ProjectionCompare | null = DEMO_COMPARE,
	plan = "base",
): WhatIfLens {
	return {
		plan,
		run: dataOf(DEMO.reads.projections["retire-early"]),
		fi: dataOf(DEMO.reads.fi["retire-early"]),
		compare,
		chance: DEMO.reads.chance["retire-early"]?.ok
			? dataOf(DEMO.reads.chance["retire-early"])
			: null,
	}
}
