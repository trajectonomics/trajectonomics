import { describe, expect, it } from "bun:test"
import { join } from "node:path"
import { FIXTURE_ACCOUNTS, fixtureHome } from "./ledger-fixture"
import { AS_OF, HORIZON, PROJECTION_SCENARIO, projection } from "./projection/testing"
import { applyScenario, documentFile, errorOf, scenarioHome } from "./scenario-test-support"
import { ledgerHome } from "./store/testing"
import { capture } from "./test-support"

const TEMPLATE_ARGS = ["scenario", "apply", "--template", "--as-of", AS_OF] as const

describe("scenario apply --template --as-of refusals", () => {
	it("refuses a Ledger with no Transaction, with a hint to record one", async () => {
		const res = await capture([...TEMPLATE_ARGS, "--json"], { TRAJ_HOME: ledgerHome() })
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			path: "--as-of",
			message: "--as-of: the Ledger records no Transaction yet",
			hint: 'Run "traj tx add" to record a Transaction, then print the template again.',
		})
	})

	it("refuses an As-of before the first Transaction, and names the date to start from", async () => {
		const res = await capture(
			["scenario", "apply", "--template", "--as-of", "2020-01-01", "--json"],
			{
				TRAJ_HOME: fixtureHome(),
			},
		)
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			path: "--as-of",
			hint: 'Run "traj scenario apply --template --as-of 2026-01-01" to start from that date.',
		})
	})

	it("refuses a data directory with no ledger, naming traj init", async () => {
		const absent = join(scenarioHome(), "absent")
		const res = await capture([...TEMPLATE_ARGS, "--json"], { TRAJ_HOME: absent })
		expect(res.code).toBe(4)
		expect(errorOf(res)).toMatchObject({
			code: "ledger_missing",
			hint: 'Run "traj init" to create one.',
		})
	})

	it("refuses --as-of without --template, naming the form that takes it", async () => {
		const res = await capture(["scenario", "apply", "base", "--as-of", AS_OF, "--json"], {
			TRAJ_HOME: fixtureHome(),
		})
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			path: "--as-of",
			message: "--as-of: pre-fills a template, so it needs --template",
			hint: 'Run "traj scenario apply --template --as-of <date>" to print a Scenario pre-filled from the Baseline at that date.',
		})
	})

	it("refuses --file beside --as-of at the document flag, naming both forms", async () => {
		const res = await capture(
			[
				"scenario",
				"apply",
				"base",
				"--file",
				documentFile(PROJECTION_SCENARIO),
				"--as-of",
				AS_OF,
				"--json",
			],
			{ TRAJ_HOME: fixtureHome() },
		)
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			path: "--file",
			message: "--file cannot be combined with --as-of",
			hint: expect.stringContaining("traj scenario apply --template --as-of <date>"),
		})
	})

	it("refuses --file beside --template with the same hint", async () => {
		const res = await capture(
			["scenario", "apply", "--file", documentFile(PROJECTION_SCENARIO), "--template", "--json"],
			{ TRAJ_HOME: scenarioHome() },
		)
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			path: "--file",
			message: "--file cannot be combined with --template",
			hint: expect.stringContaining("--as-of <date>"),
		})
	})

	it("refuses --template with --as-of and --dry-run, as the static form does", async () => {
		const res = await capture([...TEMPLATE_ARGS, "--dry-run", "--json"], {
			TRAJ_HOME: fixtureHome(),
		})
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			path: "--dry-run",
			message: "--template takes no --dry-run",
		})
	})

	it("refuses a projection whose Scenario omits a Baseline Account, and names the template", async () => {
		const home = fixtureHome()
		const accounts = PROJECTION_SCENARIO.accounts.filter(
			(account) => account.id !== FIXTURE_ACCOUNTS.loan,
		)
		const applied = await applyScenario(home, "no-loan", { ...PROJECTION_SCENARIO, accounts })
		expect(applied.code).toBe(0)
		const res = await projection(home, [
			"run",
			"--scenario",
			"no-loan",
			"--as-of",
			AS_OF,
			"--horizon",
			HORIZON,
		])
		expect(res.code).toBe(3)
		expect(errorOf(res)).toMatchObject({
			code: "projection_refused",
			hint: 'Run "traj scenario apply --template --as-of <date>" to print a Scenario that declares every asset and liability Account.',
		})
	})
})

describe("traj schema scenario apply", () => {
	it("publishes --as-of as an input field beside --template", async () => {
		const res = await capture(["schema", "scenario", "apply", "--json"])
		expect(res.code).toBe(0)
		const input = JSON.parse(res.out).input
		expect(input.properties.asOf).toMatchObject({ type: "string" })
		expect(input.properties.template).toMatchObject({ type: "boolean" })
	})
})
