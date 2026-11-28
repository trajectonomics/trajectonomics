import { describe, expect, test } from "bun:test"
import { projectionRun } from "../../contract"
import { targetNote } from "./echo"
import { drawnFigure, filledFigure, movedFigure, savedFigure } from "./figures"
import { placeOf } from "./refusal"
import { rowRefusal } from "./shown"
import { plainText } from "./words"

/** The CLI's own routing golden (cli ADR-0070): hand-worked, so each figure below is the engine's. */
const GOLDEN = new URL(
	"../../../../../cli/src/projection/fixtures/run-routing.output",
	import.meta.url,
)
const run = projectionRun.parse(JSON.parse(await Bun.file(GOLDEN).text()))
const NAMES = new Map([
	["emergency", "Emergency fund"],
	["funds", "Funds"],
	["cash", "Cash"],
])

describe("what each section did, from projection run", () => {
	test("each step filled an account: one series for each, one point a year, the CLI's own string", () => {
		const { series } = filledFigure(run, NAMES)
		expect(series.map((one) => one.name)).toEqual(["Emergency fund", "Funds", "Cash"])
		expect(series[0]?.points.map((point) => [point.xLabel, point.display])).toEqual([
			["2026", "189,000.00"],
			["2027", "3,000.00"],
		])
	})

	test("each entry drew, told apart from the other entry of its Account by its words", () => {
		const withdraw = [
			{ account: "emergency", downTo: { amount: "20000.00", growth: "inflation" as const } },
			"funds",
			"emergency",
		]
		const { series } = drawnFigure(run, withdraw, NAMES)
		expect(series.map((one) => one.name)).toEqual([
			"Take from Emergency fund, down to 20,000.00 in today's money",
			"Take from Funds",
			"Then the rest of Emergency fund",
		])
		expect(series.map((one) => one.points[0]?.display)).toEqual([
			"80,000.00",
			"241,000.00",
			"9,000.00",
		])
	})

	test("each transfer moved, and a note says what part of the plan did not move", () => {
		const { series, notes } = movedFigure(run)
		expect(series.map((one) => one.name)).toEqual(["roll-pvd", "pay-debt"])
		expect(notes).toEqual([
			"2026: 6,000.00 of pay-debt did not move.",
			"2027: 1,000.00 of pay-debt did not move.",
		])
	})

	test("a saving shows only for an Account of the contribute list", () => {
		expect(savedFigure(run, ["nowhere"], NAMES).series).toEqual([])
	})
})

describe("the target a row keeps, from the routing echo", () => {
	test("a target in today's money says it is grown by inflation, at the start; one with none says nothing", () => {
		const note = targetNote(run, "surplus", 0)
		expect(note && plainText(note, (amount) => amount)).toBe(
			"At the start 100000.00, grown by inflation: 103000.00 at the horizon.",
		)
		expect(targetNote(run, "surplus", 1)).toBeNull()
		expect(targetNote(run, "withdraw", 0)).not.toBeNull()
		expect(targetNote(undefined, "withdraw", 0)).toBeNull()
		const floor = targetNote(run, "withdraw", 0)
		expect(floor && plainText(floor, (amount) => amount)).toBe(
			"At the start 20000.00, grown by inflation: 20600.00 at the horizon.",
		)
		const body = structuredClone(run)
		const entry = body.routing?.surplus[0]
		if (entry) delete entry.resolved
		const bare = targetNote(body, "surplus", 0)
		expect(bare && plainText(bare, (amount) => amount)).toBe(
			"At the start 100000.00, grown by inflation.",
		)
	})
})

describe("where a refusal lands", () => {
	const error = (path: string, details?: unknown) => ({
		code: "invalid_input",
		exitCode: 2,
		message: "no",
		path,
		details,
	})
	test("a routing row by its position, in either list, down to its field", () => {
		expect(placeOf(error("document.cashflow.withdraw.1.downTo"), [])).toEqual({
			kind: "row",
			list: "withdraw",
			index: 1,
			field: "downTo",
		})
		expect(placeOf(error("document.cashflow.surplus.2.share"), [])).toEqual({
			kind: "row",
			list: "surplus",
			index: 2,
			field: "share",
		})
		expect(placeOf(error("document.cashflow.contribute.0"), [])).toEqual({
			kind: "row",
			list: "contribute",
			index: 0,
			field: "",
		})
	})

	test("a transfer by its position in the document that was sent, or by its id", () => {
		expect(placeOf(error("document.flows.1.target"), ["rent", "move"])).toEqual({
			kind: "flow",
			id: "move",
			field: "target",
		})
		expect(placeOf(error("document.flows.move.derive.measures.1.num"), [])).toEqual({
			kind: "flow",
			id: "move",
			field: "share",
		})
	})

	test("a transfer id that holds a dot or a backslash is one segment, so its refusal lands on its row", () => {
		expect(placeOf(error("document.flows.transfer\\.2026.target"), [])).toEqual({
			kind: "flow",
			id: "transfer.2026",
			field: "target",
		})
		expect(placeOf(error("document.flows.pay\\\\401.target"), [])).toEqual({
			kind: "flow",
			id: "pay\\401",
			field: "target",
		})
		expect(placeOf(error("--set", { documentPath: "document.flows.a\\=b.target" }), [])).toEqual({
			kind: "flow",
			id: "a=b",
			field: "target",
		})
	})

	test("a what-if's refusal names the document path in its details", () => {
		const place = placeOf(error("--set", { documentPath: "document.cashflow.surplus.1.share" }), [])
		expect(place).toEqual({ kind: "row", list: "surplus", index: 1, field: "share" })
		expect(rowRefusal(place, "no", "surplus", 1)).toBe("no")
		expect(rowRefusal(place, "no", "surplus", 0)).toBeUndefined()
		expect(placeOf(error("document.economy.inflation"), [])).toBeNull()
	})
})
