import { describe, expect, it } from "bun:test"
import { FIXTURE_ACCOUNTS } from "./ledger-fixture"
import { baseFlags, dateFlags, errorOf, projection, projectionHome } from "./projection/testing"
import { chanceFlags, modelFile } from "./projection-chance-support"
import { applyScenario, scenario, scenarioHome } from "./scenario-test-support"
import { SCENARIO_DOCUMENT } from "./store/testing"

describe("--without on an Account the Baseline holds a balance in", () => {
	it("is refused at the --without, saying the Ledger holds a balance in it", async () => {
		const home = await projectionHome()
		const path = `accounts.${FIXTURE_ACCOUNTS.bank}`
		const res = await projection(home, ["run", ...baseFlags(), "--without", path])
		expect(res.code).toBe(3)
		const error = errorOf(res)
		expect(error).toMatchObject({
			code: "projection_refused",
			path: "--without",
			details: [{ code: "UNDECLARED_BALANCE_ACCOUNT", path: "baseline.balances.0.account" }],
		})
		expect(error.message).toContain(`The Ledger holds a balance in ${path}`)
		expect(error.hint).not.toContain("scenario apply --template")
	})

	it("is refused the same way on a compare's what-if", async () => {
		const home = await projectionHome()
		const res = await projection(home, [
			"compare",
			"base",
			"--without",
			`accounts.${FIXTURE_ACCOUNTS.oldWallet}`,
			...dateFlags(),
		])
		expect(res.code).toBe(3)
		expect(errorOf(res)).toMatchObject({ code: "projection_refused", path: "--without" })
	})

	it("leaves a removal of something the Ledger holds nothing in alone", async () => {
		const home = await projectionHome()
		const res = await projection(home, ["run", ...baseFlags(), "--without", "flows.rent"])
		expect(res.code).toBe(0)
	})
})

describe("what-if wording", () => {
	it("states a JSON number and a bad decimal string in one voice", async () => {
		const home = await projectionHome()
		const number = await projection(home, [
			"run",
			...baseFlags(),
			"--set",
			"flows.salary.amount=90000.5",
			"--decimal",
		])
		const text = await projection(home, [
			"run",
			...baseFlags(),
			"--set",
			'flows.salary.amount="1.5.5"',
			"--decimal",
		])
		expect(errorOf(number).message).toStartWith("At flows.salary.amount, ")
		expect(errorOf(text).message).toStartWith("At flows.salary.amount, ")
	})

	it("says an empty --without has no path, not that the path before = is empty", async () => {
		const home = await projectionHome()
		const without = await projection(home, ["run", ...baseFlags(), "--without", ""])
		expect(errorOf(without)).toMatchObject({ path: "--without", message: "The path is empty" })
		const set = await projection(home, ["run", ...baseFlags(), "--set", "=1"])
		expect(errorOf(set).message).toBe("The path before = is empty")
	})

	it("names --without and --add when a compare has no second side", async () => {
		const home = await projectionHome()
		const res = await projection(home, ["compare", "base", ...dateFlags()])
		expect(errorOf(res).message).toBe(
			"compare needs exactly one of a second Scenario, --set, --without or --add.",
		)
	})
})

describe("--decimal with nothing to read", () => {
	const refusedAt = (res: { code: number; err: string }) => {
		expect(res.code).toBe(2)
		const error = errorOf(res as Parameters<typeof errorOf>[0])
		expect(error).toMatchObject({ code: "invalid_input", path: "--decimal" })
		expect(error.message).toContain("none is given")
	}

	it("is refused on a compare of two Scenarios", async () => {
		const home = await projectionHome()
		refusedAt(
			await projection(home, ["compare", "base", "unreachable", "--decimal", ...dateFlags()]),
		)
	})

	it("is refused on a compare, a run and a model with no --set or --add", async () => {
		const home = await projectionHome()
		refusedAt(
			await projection(home, [
				"compare",
				"base",
				"--without",
				"flows.rent",
				"--decimal",
				...dateFlags(),
			]),
		)
		refusedAt(await projection(home, ["run", ...baseFlags(), "--decimal"]))
		refusedAt(
			await projection(home, ["run", ...baseFlags(), "--without", "flows.rent", "--decimal"]),
		)
		refusedAt(await projection(home, ["model", "--scenario", "base", "--decimal"]))
		refusedAt(
			await projection(home, [
				"allowances",
				...baseFlags(),
				"--labels",
				"rmf",
				"--step",
				"1000",
				"--decimal",
			]),
		)
	})

	it("is refused on a chance and a path with no --set or --add", async () => {
		const home = await projectionHome()
		const model = modelFile(home)
		refusedAt(await projection(home, ["chance", ...chanceFlags(model), "--decimal"]))
		refusedAt(await projection(home, ["path", ...chanceFlags(model), "--index", "0", "--decimal"]))
	})

	it("is refused on a scenario fork", async () => {
		const home = scenarioHome()
		await applyScenario(home, "base", SCENARIO_DOCUMENT)
		refusedAt(await scenario(home, ["fork", "base", "copy", "--decimal"]))
	})

	it("still reads a --set or an --add item", async () => {
		const home = await projectionHome()
		const set = await projection(home, [
			"run",
			...baseFlags(),
			"--set",
			'flows.salary.amount="90000.50"',
			"--decimal",
		])
		expect(set.code).toBe(0)
	})
})
