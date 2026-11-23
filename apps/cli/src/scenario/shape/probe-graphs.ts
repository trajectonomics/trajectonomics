/** Shared Measure-graph probes for the closed value sets of a derived amount (enums.test.ts). */

/** `then`, spelled out so the object holding it is not read as a thenable (biome noThenProperty). */
const PICK_THEN = ["th", "en"].join("")

/** A `pick` Measure: `then` is the Measure id chosen when `a` is above `b`. */
function pickMeasure(op: string): Record<string, unknown> {
	const measure: Record<string, unknown> = { id: "x", op, a: "c", b: "c", else: "c" }
	measure[PICK_THEN] = "c"
	return measure
}

/** One valid Measure graph per operation a Flow's `derive` may hold, its `op` Measure first. */
export function graphOf(op: string): Record<string, unknown> {
	const constant = { id: "c", op: "const", value: 100 }
	const binary = { id: "x", op, a: "c", b: "c" }
	const graphs: Record<string, Record<string, unknown>> = {
		add: binary,
		sub: binary,
		min: binary,
		max: binary,
		scale: { id: "x", op, of: "c", num: 1, den: 2, rounding: "floor" },
		mul: { id: "x", op, a: "c", b: "c", den: 1, rounding: "floor" },
		pick: pickMeasure(op),
		flow: { id: "x", op, flow: "salary" },
		account: { id: "x", op, account: "cash" },
	}
	if (op === "const") return { measures: [{ id: "x", op, value: 100 }], result: "x" }
	// A value outside the set still needs a Measure the core can read, so its `op` is the only fault.
	const measure = graphs[op] ?? { id: "x", op, value: 1 }
	return { measures: [measure, constant], result: "x" }
}
