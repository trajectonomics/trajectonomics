import { describe, expect, it } from "bun:test"
import { projection } from "./projection/testing"
import { exampleHome } from "./projection-accounts-support"
import { EXAMPLE_FLAGS } from "./projection-spending-support"
import { acceptedScenarioSchemaVersion } from "./scenario/document"
import { scenarioExample } from "./scenario/shape"
import { applyScenario, errorOf, scenarioHome } from "./scenario-test-support"

/*
 * The refusals of a spending rule (sim ADR 0023, cli ADR-0063): each code the document check finds
 * reaches the caller at the path of the field that is wrong, with a sentence and a way out, from
 * `scenario apply` (and so from `--set`, the Store and a restore, which share the check).
 */

type Doc = Record<string, unknown>

const EXAMPLE = scenarioExample(acceptedScenarioSchemaVersion() ?? 0) as Doc & { flows: Doc[] }

/** `retire`'s date criterion alone: the example's wealth criterion reads accessible net worth, which this plan does not need. */
const DATE_ONLY = { id: "age", kind: "date", on: "2045-01-01" }

/** The example's own rule Flow, which every case below changes one field of. */
const RULE_FLOW = EXAMPLE.flows.find((flow) => flow["id"] === "retirement-spending") as Doc

/** The example with its rule Flow replaced, and the index that Flow has in the document. */
function withRuleFlow(patch: Doc, rulePatch: Doc = {}): { document: Doc; at: number } {
	const at = EXAMPLE.flows.indexOf(RULE_FLOW)
	const flow = { ...RULE_FLOW, ...patch, rule: { ...(RULE_FLOW["rule"] as Doc), ...rulePatch } }
	const flows = EXAMPLE.flows.map((entry, index) => (index === at ? flow : entry))
	return { document: { ...EXAMPLE, flows }, at }
}

async function refused(document: Doc) {
	const res = await applyScenario(scenarioHome(), "example", document)
	expect(res.code).toBe(2)
	return errorOf(res)
}

describe("a spending rule the document check refuses", () => {
	it("on an income Flow: RULE_NOT_EXPENSE at the rule, saying a rule sets an expense", async () => {
		const { document, at } = withRuleFlow({ kind: "income", earned: false, category: undefined })
		const error = await refused(document)
		expect(error).toMatchObject({ code: "invalid_input", path: `document.flows.${at}.rule` })
		expect(error.message).toContain("not an expense")
		expect(error.hint).toContain('"kind": "expense"')
		expect(error.details).toContainEqual(
			expect.objectContaining({ code: "RULE_NOT_EXPENSE", path: `document.flows.${at}.rule` }),
		)
	})

	it("over an illiquid Account: RULE_PORTFOLIO_ILLIQUID at that portfolio entry", async () => {
		const { document, at } = withRuleFlow({}, { portfolio: ["cash", "home"] })
		const error = await refused(document)
		expect(error.path).toBe(`document.flows.${at}.rule.portfolio.1`)
		expect(error.message).toContain("liquid: false")
		expect(error.hint).toContain("liquid asset Accounts")
	})

	it("over a liability: RULE_PORTFOLIO_LIABILITY at that portfolio entry", async () => {
		const { document, at } = withRuleFlow({}, { portfolio: ["loan"] })
		const error = await refused(document)
		expect(error.path).toBe(`document.flows.${at}.rule.portfolio.0`)
		expect(error.message).toContain("names a liability")
	})

	it("paid weekly: RULE_FREQUENCY at the frequency, naming the two it takes", async () => {
		for (const frequency of ["weekly", "once"]) {
			const { document, at } = withRuleFlow({ frequency })
			const error = await refused(document)
			expect(error.path).toBe(`document.flows.${at}.frequency`)
			expect(error.message).toContain("neither monthly nor annual")
			expect(error.hint).toContain('"monthly" or "annual"')
		}
	})

	it("with a floor above its ceiling: RULE_FLOOR_ABOVE_CEILING at the floor", async () => {
		const { document, at } = withRuleFlow(
			{},
			{
				kind: "currentRate",
				upper: undefined,
				lower: undefined,
				floor: { amount: 900_000, growth: { bps: 0 } },
				ceiling: { amount: 100_000, growth: { bps: 0 } },
			},
		)
		const error = await refused(document)
		expect(error.path).toBe(`document.flows.${at}.rule.floor`)
		expect(error.message).toContain("floor is above its ceiling")
	})

	it("beside a next12Months Metric: NEXT_12_MONTHS_READS_ACCOUNT names the rule and the startAt way out", async () => {
		const lean = {
			id: "lean",
			combine: "all",
			criteria: [
				{
					id: "covers",
					kind: "multiple",
					metric: "netWorth",
					op: "atLeast",
					base: { expenses: "next12Months" },
					num: 25,
					den: 1,
					terms: "nominal",
				},
			],
		}
		// A plan with no home, whose own derived amounts would be refused beside the Metric as well.
		const plan = (startAt: string): Doc => ({
			...EXAMPLE,
			estate: {},
			accounts: [
				{ id: "cash", kind: "asset", rate: 150 },
				{ id: "index", kind: "asset", rate: 600 },
			],
			flows: [{ ...RULE_FLOW, startAt }],
			cashflow: { surplus: [{ account: "cash" }], contribute: [], withdraw: ["cash"] },
			milestones: [{ ...(EXAMPLE["milestones"] as Doc[])[0], criteria: [DATE_ONLY] }, lean],
		})
		const error = await refused(plan("retire"))
		expect(error.path).toBe("document.milestones.1.criteria.0.base.expenses")
		expect(error.message).toContain("spending rule")
		expect(error.hint).toContain('"startAt"')
		// The way out: the rule Flow gated on the Milestone the Metric sits on is accepted.
		const ok = await applyScenario(scenarioHome(), "example", plan("lean"))
		expect(ok.err).toBe("")
		expect(ok.code).toBe(0)
	})
})

describe("a spending rule an Override would break", () => {
	it("refuses a weekly rule from --set at the flag, naming the code and the document path", async () => {
		const res = await projection(await exampleHome(), [
			"run",
			...EXAMPLE_FLAGS,
			"--set",
			'flows.retirement-spending.frequency="weekly"',
		])
		expect(res.code).toBe(2)
		const error = errorOf(res)
		expect(error.path).toBe("--set")
		expect(error.message).toContain("RULE_FREQUENCY")
		expect(JSON.stringify(error.details)).toContain("flows.13.frequency")
	})
})
