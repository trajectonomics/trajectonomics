import { describe, expect, it } from "bun:test"
import { TAX_CONTRIBUTION_LABELS, TAX_INCOME_LABELS } from "../tax/labels"
import { scenarioExample } from "./index"
import { graphOf } from "./probe-graphs"
import { canonical, documented, nodeAt, type Path, probed, refusalsOf, VERSION } from "./testing"

/*
 * Every closed value set the published shape states, probed against the pinned core: each value it
 * lists is one the core accepts in that position, and a value outside the set is refused there by
 * the code the core uses. The probes are also the coverage proof — the values they place at a path
 * are exactly the set the schema publishes — so a value set cannot ship unprobed.
 */

const CASH = { id: "cash", kind: "asset", rate: 0 }
const EXPENSE = { kind: "expense", amount: 1, frequency: "monthly", growth: { bps: 0 } }
const INCOME = {
	kind: "income",
	earned: true,
	amount: 1_000,
	frequency: "monthly",
	growth: { bps: 0 },
}

/** A Scenario with the Flows and the Accounts it needs, so one field is the only difference. */
function probe(input: {
	flows: Record<string, unknown>[]
	accounts?: Record<string, unknown>[]
	contribute?: string[]
}): Record<string, unknown> {
	return {
		...scenarioExample(VERSION ?? 0),
		estate: {},
		accounts: input.accounts ?? [CASH],
		flows: input.flows.map((flow) => ({ id: "flow", start: "2026-01-01", ...flow })),
		cashflow: {
			surplus: [{ account: "cash" }],
			contribute: input.contribute ?? [],
			withdraw: [],
		},
	}
}

/** A Contribution into the asset Account `cash`, which a `funding` value may be stated on. */
const BUY = {
	kind: "contribution",
	target: "cash",
	amount: 1,
	frequency: "monthly",
	growth: { bps: 0 },
}

/** One valid Flow per kind, because each kind requires and forbids its own keys. */
const KIND_FLOWS: Record<string, Record<string, unknown>> = {
	income: INCOME,
	expense: EXPENSE,
	contribution: {
		kind: "contribution",
		target: "cash",
		amount: 1,
		frequency: "monthly",
		growth: { bps: 0 },
	},
	withdrawal: { ...EXPENSE, kind: "withdrawal", source: "debt" },
}

/** The Flows a derived amount is probed with: an income Flow to reference, and the graph. */
function deriveFlows(op: string): Record<string, unknown>[] {
	return [
		{ id: "salary", ...INCOME },
		{ id: "derived", kind: "expense", frequency: "monthly", derive: graphOf(op) },
	]
}

/** The `scale` graph's one `"floor"`, swapped for the rounding probed. */
function roundedFlows(rounding: string): Record<string, unknown>[] {
	return JSON.parse(JSON.stringify(deriveFlows("scale")).replace('"floor"', `"${rounding}"`))
}

type EnumProbe = {
	path: Path
	/** One document per listed value, all accepted, together covering the whole set. */
	accepted: () => unknown[]
	/** A document that puts a value outside the set where the set lives. */
	refused: () => unknown
	code: string
}

const PROBES: EnumProbe[] = [
	{
		path: ["accounts", 0, "kind"],
		accepted: () =>
			(nodeAt(["accounts", 0, "kind"])["enum"] as string[]).map((kind) =>
				probe({ flows: [EXPENSE], accounts: [{ id: "probe", kind, rate: 0 }, CASH] }),
			),
		refused: () =>
			probe({ flows: [EXPENSE], accounts: [{ id: "probe", kind: "bond", rate: 0 }, CASH] }),
		code: "INVALID_KIND",
	},
	{
		path: ["accounts", 1, "compounding"],
		accepted: () =>
			(nodeAt(["accounts", 1, "compounding"])["enum"] as string[]).map((compounding) =>
				probe({
					flows: [EXPENSE],
					accounts: [CASH, { id: "index", kind: "asset", rate: 100, compounding }],
				}),
			),
		refused: () =>
			probe({
				flows: [EXPENSE],
				accounts: [CASH, { id: "index", kind: "asset", rate: 100, compounding: "daily" }],
			}),
		code: "INVALID_COMPOUNDING",
	},
	{
		path: ["flows", 0, "kind"],
		accepted: () =>
			(nodeAt(["flows", 0, "kind"])["enum"] as string[]).map((kind) =>
				probe({
					flows: [KIND_FLOWS[kind] as Record<string, unknown>],
					accounts: [CASH, { id: "debt", kind: "liability", rate: 0 }],
					contribute: kind === "contribution" ? ["cash"] : [],
				}),
			),
		refused: () => probe({ flows: [{ ...EXPENSE, kind: "bonus" }] }),
		code: "INVALID_KIND",
	},
	{
		path: ["flows", 0, "frequency"],
		accepted: () =>
			(nodeAt(["flows", 0, "frequency"])["enum"] as string[]).map((frequency) =>
				probe({ flows: [{ ...EXPENSE, frequency }] }),
			),
		refused: () => probe({ flows: [{ ...EXPENSE, frequency: "hourly" }] }),
		code: "INVALID_FREQUENCY",
	},
	{
		path: ["flows", 0, "funding"],
		accepted: () =>
			(nodeAt(["flows", 0, "funding"])["enum"] as string[]).map((funding) =>
				probe({ flows: [{ ...BUY, funding }], contribute: ["cash"] }),
			),
		refused: () => probe({ flows: [{ ...BUY, funding: "sometimes" }] }),
		code: "INVALID_FUNDING",
	},
	{
		path: ["flows", 1, "derive", "measures", 0, "op"],
		accepted: () =>
			(nodeAt(["flows", 1, "derive", "measures", 0, "op"])["enum"] as string[]).map((op) =>
				probe({ flows: deriveFlows(op) }),
			),
		refused: () => probe({ flows: deriveFlows("nope") }),
		code: "INVALID_OP",
	},
	{
		path: ["flows", 1, "derive", "measures", 0, "rounding"],
		accepted: () =>
			(nodeAt(["flows", 1, "derive", "measures", 0, "rounding"])["enum"] as string[]).map(
				(rounding) => probe({ flows: roundedFlows(rounding) }),
			),
		refused: () => probe({ flows: roundedFlows("halfEven") }),
		code: "INVALID_ROUNDING",
	},
	{
		path: ["calendar", "dayRule"],
		accepted: () =>
			(nodeAt(["calendar", "dayRule"])["enum"] as string[]).map((dayRule) => ({
				...scenarioExample(VERSION ?? 0),
				estate: {},
				calendar: { dayRule, holidays: [] },
			})),
		refused: () => ({
			...scenarioExample(VERSION ?? 0),
			estate: {},
			calendar: { dayRule: "nearest", holidays: [] },
		}),
		code: "INVALID_DAY_RULE",
	},
]

/** Paths probed in their own file: milestone criteria, the level rounding and a spending rule's kind and rounding (rule-enums.test.ts), an estate line's rounding and base (estate-enums.test.ts) and an Account's payout and fee (account-enums.test.ts). */
const PROBED_ELSEWHERE = /^(milestones|estate|flows\.\*\.(level|rule)|accounts\.\*\.(payout|fee))\./

describe("the closed value sets the shape states", () => {
	it("covers every one of them with a probe", () => {
		const enums = documented().filter(
			(entry) => Array.isArray(entry.node["enum"]) && !PROBED_ELSEWHERE.test(canonical(entry.path)),
		)
		expect(enums.map((entry) => canonical(entry.path)).sort()).toEqual(
			PROBES.map((entry) => canonical(entry.path)).sort(),
		)
	})

	it("states every value each set accepts, and only those", () => {
		for (const entry of PROBES) {
			const values = nodeAt(entry.path)["enum"] as string[]
			const documents = entry.accepted()
			expect(documents).toHaveLength(values.length)
			for (const document of documents) expect(refusalsOf(document)).toEqual([])
			const probedValues = documents.map((document) => readAt(document, entry.path))
			expect([...probedValues].sort()).toEqual([...values].sort())
		}
	})

	it("names every tax label a Flow may carry, in the field that carries one", () => {
		const label = String(nodeAt(["flows", 0, "label"])["description"])
		for (const code of [...TAX_INCOME_LABELS, ...TAX_CONTRIBUTION_LABELS]) {
			expect(label).toContain(code)
		}
	})

	it("refuses a value outside each set it states, at that field", () => {
		for (const entry of PROBES) {
			expect(refusalsOf(entry.refused())).toContainEqual({
				code: entry.code,
				path: probed(entry.path),
			})
		}
	})
})

/** The value at a path whose indices are written out, as the probes place them. */
function readAt(value: unknown, path: Path): unknown {
	return path.reduce<unknown>(
		(current, segment) => (current as Record<string, unknown>)[String(segment)],
		value,
	)
}
