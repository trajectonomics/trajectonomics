import { describe, expect, it } from "bun:test"
import { FI_HORIZON } from "./projection/fi-method"
import type { FiView } from "./projection/fi-view"
import { dateFlags, fi, projectionHome } from "./projection/testing"
import { PREPAYMENT_FLOW } from "./scenario/shape/description"
import { applyScenario, documentFile, errorOf, scenarioHome } from "./scenario-test-support"
import { SCENARIO_DOCUMENT } from "./store/testing"
import { capture } from "./test-support"

/*
 * The text an agent with only `traj --help` and `traj schema` reads to build a plan (#256, the
 * 0.7.0 validation run): each sentence below is one a person had to find by trial before.
 */

const HINT = 'Run "traj schema scenario apply" to see the document schema.'

/** The base document with one Flow replaced by the given fields, applied, and the refusal it gets. */
async function refusalOf(change: Record<string, unknown>) {
	const flows = [{ ...SCENARIO_DOCUMENT.flows[0], ...change }, SCENARIO_DOCUMENT.flows[1]]
	const res = await applyScenario(scenarioHome(), "base", { ...SCENARIO_DOCUMENT, flows })
	expect(res.code).toBe(2)
	return errorOf(res)
}

describe("the way to the document schema", () => {
	it("is named by scenario apply's --file description", async () => {
		const res = await capture(["scenario", "apply", "--help"])
		expect(res.out).toContain("its schema is `traj schema scenario apply`")
	})

	it("opens the bare schema listing with how to read one command, in JSON and in text", async () => {
		const line = "traj schema <command> prints a command's flags and the document it reads."
		const json = await capture(["schema", "--json"])
		expect(Object.keys(JSON.parse(json.out))[0]).toBe("usage")
		expect(JSON.parse(json.out).usage).toBe(line)
		expect((await capture(["schema"])).out.split("\n")[0]).toContain(line)
	})

	it("rides every document refusal, not only an unsupported version", async () => {
		const error = await refusalOf({ nope: 1 })
		expect(error.code).toBe("invalid_input")
		expect(error.hint).toBe(HINT)
	})
})

describe("a refusal says what is allowed", () => {
	it("lists the kinds of a Flow, the frequencies, and the forms of a growth", async () => {
		expect((await refusalOf({ kind: "payment" })).message).toBe(
			"document.flows.0.kind: INVALID_KIND (one of: income, expense, contribution)",
		)
		expect((await refusalOf({ frequency: "yearly" })).message).toBe(
			"document.flows.0.frequency: INVALID_FREQUENCY (one of: once, daily, weekly, biweekly, monthly, quarterly, annual)",
		)
		expect((await refusalOf({ growth: "zero" })).message).toBe(
			'document.flows.0.growth: INVALID_GROWTH (one of: "inflation", {"bps": <integer>}; {"bps": 0} is a fixed amount)',
		)
	})

	it("says it in each detail row too, so a list of refusals is as plain as the first", async () => {
		const error = await refusalOf({ kind: "payment" })
		expect(error.details).toEqual([
			{ path: "document.flows.0.kind", message: error.message, code: "INVALID_KIND" },
		])
	})

	it("lists the kinds of an Account where an Account is refused", async () => {
		const accounts = [{ id: "cash", kind: "cash", rate: 0 }, SCENARIO_DOCUMENT.accounts[1]]
		const res = await applyScenario(scenarioHome(), "base", { ...SCENARIO_DOCUMENT, accounts })
		expect(errorOf(res).message).toBe(
			"document.accounts.0.kind: INVALID_KIND (one of: asset, liability)",
		)
	})

	it("says a rate is in basis points when a fraction is given for one", async () => {
		const economy = { inflation: 0.02 }
		const res = await applyScenario(scenarioHome(), "base", { ...SCENARIO_DOCUMENT, economy })
		expect(errorOf(res).message).toBe(
			"document.economy.inflation: NOT_SAFE_INTEGER (basis points, a whole number: 2% is 200)",
		)
		const growth = await refusalOf({ growth: { bps: 0.5 } })
		expect(growth.message).toContain("2% is 200")
	})

	it("adds nothing to a safe-integer refusal that is not a rate", async () => {
		const error = await refusalOf({ amount: 1.5 })
		expect(error.message).toBe("document.flows.0.amount: NOT_SAFE_INTEGER")
	})
})

describe("a one-off what-if", () => {
	it("is shown as a once contribution to the liability, and the document accepts it", async () => {
		const flows = [...SCENARIO_DOCUMENT.flows, PREPAYMENT_FLOW]
		const res = await applyScenario(scenarioHome(), "base", { ...SCENARIO_DOCUMENT, flows })
		expect(res.code).toBe(0)
		const described = await capture(["schema", "scenario", "apply", "--json"])
		expect(described.out).toContain("lump-sum loan prepayment")
	})
})

describe("the horizon", () => {
	it("is described as the last date the plan has to fund, in fi's help and its flag", async () => {
		const help = (await capture(["fi", "--help"])).out
		expect(help).toContain(FI_HORIZON)
		expect(help).toContain("the age-95 date")
	})

	it("is echoed in a note of the fi result", async () => {
		const home = await projectionHome()
		const res = await fi(home, ["--scenario", "base", ...dateFlags()])
		const notes = (JSON.parse(res.out) as FiView).notes
		const flags = dateFlags()
		const horizon = flags[flags.indexOf("--horizon") + 1]
		expect(notes).toContain(
			`The FI answer is for a horizon of ${horizon}: the money has to last until then, and a later horizon can move the FI date later.`,
		)
	})
})

describe("the tax a carried-in amount names", () => {
	it("is described as decimal THB strings of the period before --as-of", async () => {
		const line = (await capture(["fi", "--help"])).out
		expect(line).toContain('as "1200000.00" in THB, not satang')
		expect(line).toContain("on or after --as-of is projected and must not be in them")
	})

	it("is refused with the form named when it is a number of satang", async () => {
		const home = await projectionHome()
		const record = {
			scenario: "base",
			levy: "th-2026-pit",
			periodStart: "2026-01-01",
			tallies: [{ label: "income.section40_1", basis: "gross", amount: 120_000_000 }],
			prepaid: "0.00",
		}
		const res = await fi(home, [
			"--scenario",
			"base",
			...dateFlags(),
			"--carry-in",
			documentFile([record]),
		])
		const error = errorOf(res)
		expect(error.path).toBe("document.0.tallies.0.amount")
		expect(error.message).toBe(
			'The amount must be a decimal string in the Currency\'s major unit, for example "1200000.00" in THB, not a number of satang.',
		)
	})
})

describe("a Contribution that was not funded", () => {
	it("says why in the schema and in the note, and what to write instead", async () => {
		const described = (await capture(["schema", "scenario", "apply", "--json"])).out
		expect(described).toContain("so a lump sum from savings is not funded")
		const home = await projectionHome()
		const res = await capture(
			[
				"projection",
				"run",
				"--scenario",
				"base",
				...dateFlags(),
				"--set",
				"flows.invest.amount=20000000",
				"--json",
			],
			{ TRAJ_HOME: home },
		)
		const notes: string[] = JSON.parse(res.out).notes
		expect(notes.join(" ")).toContain(
			"so a lump sum from savings is not funded: use a monthly Flow.",
		)
	})
})
