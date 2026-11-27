import { describe, expect, test } from "bun:test"
import type { Snapshot } from "../../contract"
import { fiFixture, UNREACHABLE } from "../fi/fixtures.test-support"
import { DEMO } from "../what-if/fixtures.test-support"
import { focusOf } from "./focus"

/** The Demo with no FI read at all, as a Snapshot made before the FI leaf existed. */
function withoutFi(snapshot: Snapshot): Snapshot {
	const copy = structuredClone(snapshot)
	copy.reads.fi = {}
	return copy
}

/** A plan that runs out, with the year row's ages taken away. */
function withoutAges(): Snapshot {
	const copy = structuredClone(DEMO)
	const read = copy.reads.projections["retire-early"]
	if (read === undefined || !read.ok) throw new Error("the Demo has retire-early")
	const table = read.data.tables.find((one) => one.name === "annual")
	if (table?.name !== "annual") throw new Error("the Demo has an annual table")
	for (const row of table.rows) row.ages = []
	return copy
}

describe("focusOf, one case per row of the table", () => {
	test("case 1: no plan, or no FI read, asks for a plan", () => {
		const noPlan: Snapshot = { ...DEMO, params: { ...DEMO.params, scenarios: [], compare: null } }
		for (const focus of [focusOf(noPlan), focusOf(withoutFi(DEMO))]) {
			expect(focus).toMatchObject({
				kind: "setup",
				answer: "Set up your plan",
				button: { label: "Start a plan", href: "/plans/", external: false },
				plan: null,
				stopDate: null,
				faces: [],
			})
			expect(focus.sentence).toBe(
				"Where do you stand? Add your income, spending and savings, and traj answers when you could stop working.",
			)
		}
	})

	test("case 2: the projection's run-out wins, with the holder's age from the year row", () => {
		const focus = focusOf(DEMO, "retire-early")
		expect(focus).toMatchObject({
			kind: "runsOut",
			answer: "Feb 2053",
			stopDate: "2053-02-01",
			horizonYear: "2053",
			unmet: "39410.06",
			currency: "THB",
			button: { label: "See where it runs out", href: "/projection/" },
			counts: null,
		})
		expect(focus.sentence).toBe("Your money runs out in Feb 2053, at 62.")
		expect(focus.faces.map((face) => [face.initial, face.age])).toEqual([
			["Y", 62],
			["Y", 60],
		])
	})

	test("case 2 leaves the age out when the year row states no holder age", () => {
		expect(focusOf(withoutAges(), "retire-early").sentence).toBe("Your money runs out in Feb 2053.")
	})

	test("case 3: a reachable FI date, the ages and the chance clause", () => {
		const focus = focusOf(DEMO, "base")
		expect(focus).toMatchObject({
			kind: "reachable",
			answer: "Oct 2040",
			stopDate: "2040-10-01",
			horizonYear: "2053",
			counts: { succeeded: 193, paths: 200 },
			button: { label: "See your plan", href: "/projection/" },
		})
		expect(focus.sentence).toBe(
			"You could stop working in Oct 2040, when you are 50 and your partner is 48. Your money lasts to 2053 in 193 of 200 markets tested.",
		)
		expect(focus.faces.map((face) => [face.name, face.initial, face.age])).toEqual([
			["You", "Y", 50],
			["Your partner", "Y", 48],
		])
	})

	test("case 3 leaves the chance clause out when the Snapshot holds no chance read", () => {
		const copy = structuredClone(DEMO)
		copy.reads.chance = {}
		const focus = focusOf(copy, "base")
		expect(focus.sentence).toBe(
			"You could stop working in Oct 2040, when you are 50 and your partner is 48.",
		)
		expect(focus.counts).toBeNull()
	})

	test("case 4: an unreachable FI read, its horizon and the CLI's best case", () => {
		const copy = structuredClone(DEMO)
		copy.reads.fi["base"] = {
			argv: ["fi", "base"],
			ok: true,
			data: fiFixture(UNREACHABLE.insufficientMoney),
		}
		const focus = focusOf(copy, "base")
		expect(focus).toMatchObject({
			kind: "unreachable",
			answer: "Not by 2060",
			stopDate: null,
			horizonYear: "2060",
			faces: [],
			button: { label: "See your plan", href: "/projection/" },
		})
		expect(focus.sentence).toContain("You could not stop working before 31 Dec 2060.")
	})

	test("runsOut wins over a reachable FI date", () => {
		const copy = structuredClone(DEMO)
		const read = copy.reads.projections["base"]
		if (read === undefined || !read.ok) throw new Error("the Demo has base")
		read.data.runsOut = { date: "2045-06-01", unmet: "1.00" }
		const focus = focusOf(copy, "base")
		expect(focus.kind).toBe("runsOut")
		expect(focus.answer).toBe("Jun 2045")
	})
})
