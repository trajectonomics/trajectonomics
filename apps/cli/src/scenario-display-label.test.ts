// A display label names a Flow, a Milestone or a household person, and the CLI states it where it
// states the id and refuses text the core refuses, without rewriting it (sim ADR 0032, cli ADR 0080).
import { describe, expect, it } from "bun:test"
import {
	applyScenario,
	errorOf,
	resultOf,
	rowOf,
	scenario,
	scenarioHome,
} from "./scenario-test-support"
import { capture } from "./test-support"

type Flow = { id: string; displayLabel?: string }
type Doc = { flows: Flow[]; milestones?: { id: string; displayLabel?: string }[] }

const DOC = {
	schemaVersion: 4,
	currency: "THB",
	economy: { inflation: 0 },
	accounts: [{ id: "cash", kind: "asset", rate: 0 }],
	flows: [
		{
			id: "school-fees",
			kind: "expense",
			amount: 500_000,
			frequency: "monthly",
			start: "2026-02-01",
			growth: { bps: 0 },
		},
	],
	cashflow: { surplus: [{ account: "cash" }], contribute: [], withdraw: ["cash"] },
}

const MILESTONE = {
	id: "condo-down",
	combine: "all",
	criteria: [{ id: "d", kind: "date", on: "2030-01-01" }],
}

const HOUSEHOLD = {
	schemaVersion: 1,
	people: [{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 }],
	anchors: [],
}

/** `scenario show`, as the document it states. */
async function shown(home: string): Promise<Doc> {
	const res = await scenario(home, ["show", "base"])
	expect(res.code).toBe(0)
	return (resultOf(res) as { scenario: { document: Doc } }).scenario.document
}

/** `scenario household base --file -`, with the household as JSON text. */
function household(home: string, document: unknown): ReturnType<typeof capture> {
	return capture(
		["scenario", "household", "base", "--file", "-", "--json"],
		{ TRAJ_HOME: home },
		undefined,
		JSON.stringify(document),
	)
}

/** The household's people, as `scenario show` states them. */
async function people(home: string): Promise<Record<string, unknown>[]> {
	const res = await scenario(home, ["show", "base"])
	return (resultOf(res) as { scenario: { household: { people: Record<string, unknown>[] } } })
		.scenario.household.people
}

describe("a Flow's display label round-trips through the CLI", () => {
	it("stores a --add item's label and states it in scenario show", async () => {
		const home = scenarioHome()
		expect((await applyScenario(home, "base", DOC)).code).toBe(0)
		const added = { ...DOC.flows[0], id: "tuition", displayLabel: "School fees" }
		const res = await scenario(home, ["apply", "base", "--add", `flows=${JSON.stringify(added)}`])
		expect(res.code).toBe(0)
		expect((await shown(home)).flows.map((flow) => flow.displayLabel)).toContain("School fees")
	})

	it("begins the label a stored Flow leaves out with --set, and moves the content hash", async () => {
		const home = scenarioHome()
		const first = await applyScenario(home, "base", DOC)
		const before = rowOf(resultOf(first)).contentHash
		const set = await scenario(home, [
			"apply",
			"base",
			"--set",
			'flows.school-fees.displayLabel="Condo down payment"',
		])
		expect(set.code).toBe(0)
		expect(rowOf(resultOf(set)).contentHash).not.toBe(before)
		expect((await shown(home)).flows[0]?.displayLabel).toBe("Condo down payment")
	})

	it("states a Milestone's label in the document scenario show prints", async () => {
		const home = scenarioHome()
		const document = { ...DOC, milestones: [{ ...MILESTONE, displayLabel: "Condo down" }] }
		expect((await applyScenario(home, "base", document)).code).toBe(0)
		expect((await shown(home)).milestones?.[0]?.displayLabel).toBe("Condo down")
	})

	it("writes a document without a label byte-identically", async () => {
		const home = scenarioHome()
		const res = await applyScenario(home, "base", DOC)
		expect(res.code).toBe(0)
		expect(res.out).not.toContain("displayLabel")
		expect((await shown(home)).flows[0]).not.toHaveProperty("displayLabel")
	})

	it("refuses a label over 80 code points, naming the rule, and writes nothing", async () => {
		const home = scenarioHome()
		expect((await applyScenario(home, "base", DOC)).code).toBe(0)
		const res = await scenario(home, [
			"apply",
			"base",
			"--set",
			`flows.school-fees.displayLabel="${"a".repeat(81)}"`,
		])
		expect(res.code).toBe(2)
		const error = errorOf(res)
		expect(error.code).toBe("invalid_input")
		expect(error.path).toBe("--set")
		expect(error.message).toContain("INVALID_LABEL (1 to 80 code points")
		expect((await shown(home)).flows[0]).not.toHaveProperty("displayLabel")
	})

	it("refuses an untrimmed label rather than rewriting it", async () => {
		const res = await applyScenario(scenarioHome(), "base", {
			...DOC,
			flows: [{ ...DOC.flows[0], displayLabel: " School fees " }],
		})
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			path: "document.flows.0.displayLabel",
		})
	})
})

describe("a household person's display label round-trips, and is refused over 80", () => {
	it("stores the person's label through scenario household", async () => {
		const home = scenarioHome()
		expect((await applyScenario(home, "base", DOC)).code).toBe(0)
		const document = {
			...HOUSEHOLD,
			people: [{ ...HOUSEHOLD.people[0], displayLabel: "Somchai" }],
		}
		expect((await household(home, document)).code).toBe(0)
		expect((await people(home))[0]?.["displayLabel"]).toBe("Somchai")
	})

	it("refuses a person's label over 80 code points at its path", async () => {
		const home = scenarioHome()
		expect((await applyScenario(home, "base", DOC)).code).toBe(0)
		const document = {
			...HOUSEHOLD,
			people: [{ ...HOUSEHOLD.people[0], displayLabel: "a".repeat(81) }],
		}
		const res = await household(home, document)
		expect(res.code).toBe(2)
		expect(errorOf(res).path).toBe("document.people.0.displayLabel")
	})
})
