import { describe, expect, it } from "bun:test"
import { projection } from "./projection/testing"
import {
	allowances,
	allowancesHome,
	bodyOf,
	planFlags,
	YEARS,
} from "./projection-allowances-support"
import { runBody } from "./projection-run-support"
import { documentFile } from "./scenario-test-support"
import { capture } from "./test-support"

/** The plan in its decimal form, with every suggested Flow added, stored as `applied`. */
async function applySuggestions(home: string): Promise<void> {
	const body = bodyOf(await allowances(home, planFlags()))
	const shown = await capture(["scenario", "show", "plan", "--decimal", "--json"], {
		TRAJ_HOME: home,
	})
	const document = (JSON.parse(shown.out) as { scenario: { document: { flows: unknown[] } } })
		.scenario.document
	const flows = body.allowances.flatMap((row) => (row.flow === undefined ? [] : [row.flow]))
	const file = documentFile({ ...document, flows: [...document.flows, ...flows] })
	const applied = await capture(
		["scenario", "apply", "applied", "--file", file, "--decimal", "--json"],
		{ TRAJ_HOME: home },
	)
	expect(applied.err).toBe("")
	expect(applied.code).toBe(0)
}

describe("an applied suggestion", () => {
	it("leaves nothing more to add in those years", async () => {
		const home = await allowancesHome()
		await applySuggestions(home)
		const body = bodyOf(await allowances(home, planFlags("10000", "applied")))
		expect(body.allowances.map((row) => row.extra)).toEqual(["0.00", "0.00", "0.00", "0.00"])
		expect(body.allowances.every((row) => row.flow === undefined)).toBe(true)
	})

	it("lowers each year's tax by exactly the stated saving", async () => {
		const home = await allowancesHome()
		const said = bodyOf(await allowances(home, planFlags()))
		await applySuggestions(home)
		const dueOf = async (name: string) => {
			const run = runBody(await projection(home, ["run", "--scenario", name, ...YEARS]))
			return new Map(run.taxYears.map((year) => [year.from, BigInt(year.due.replace(".", ""))]))
		}
		const before = await dueOf("plan")
		const after = await dueOf("applied")
		expect(said.taxYears).toHaveLength(2)
		for (const year of said.taxYears) {
			const fell = (before.get(year.from) ?? 0n) - (after.get(year.from) ?? 0n)
			expect(fell).toBe(BigInt(year.saving.replace(".", "")))
		}
	})
})
