import { describe, expect, it } from "bun:test"
import { projection } from "./projection/testing"
import { exampleHome } from "./projection-accounts-support"
import { runBody } from "./projection-run-support"
import { EXAMPLE_FLAGS, major, minor, yearsOf } from "./projection-spending-support"

/*
 * `projection run --spending` inside a What-if (cli ADR-0063, ADR-0056): `--set` edits the rule and
 * the table follows, and under `--decimal` a rate is read as the percent string it prints as.
 */

describe("--spending beside --set", () => {
	it("reads the flag in a What-if, so the table follows the edit", async () => {
		const home = await exampleHome()
		const res = await projection(home, [
			"run",
			...EXAMPLE_FLAGS,
			"--spending",
			"--set",
			"flows.retirement-spending.rule.rateBps=500",
		])
		expect(res.code).toBe(0)
		const [first] = yearsOf(runBody(res), "retirement-spending")
		expect(first?.amount).toBe(major((minor(first?.portfolio ?? "0") * 500n) / 10_000n))
	})

	it("reads a rule's rate in percent under --decimal, and a bound in major units", async () => {
		const home = await exampleHome()
		const res = await projection(home, [
			"run",
			...EXAMPLE_FLAGS,
			"--spending",
			"--decimal",
			"--set",
			'flows.retirement-spending.rule.rateBps="5.00"',
		])
		expect(res.code).toBe(0)
		const [first] = yearsOf(runBody(res), "retirement-spending")
		expect(first?.amount).toBe(major((minor(first?.portfolio ?? "0") * 500n) / 10_000n))
	})

	it("refuses a rate with a third decimal place at --set, and says how to write it", async () => {
		const home = await exampleHome()
		for (const value of ['"5.005"', "5"]) {
			const res = await projection(home, [
				"run",
				...EXAMPLE_FLAGS,
				"--spending",
				"--decimal",
				"--set",
				`flows.retirement-spending.rule.rateBps=${value}`,
			])
			expect(res.code).toBe(2)
			const { error } = JSON.parse(res.err) as { error: { path: string; hint: string } }
			expect(error.path).toBe("--set")
			expect(error.hint).toContain('"4.00"')
		}
	})
})
