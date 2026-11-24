// The stored tax profile follows the Levy: a write that changes the Levy by hand clears it, so a
// later `--merge` or `--from-stored` cannot silently overwrite the change (cli ADR-0066).
import { describe, expect, it } from "bun:test"
import { shown, tax, taxedHome } from "./scenario-tax-profile-support"
import { applyScenario, errorOf, scenario } from "./scenario-test-support"

type Levy = { id: string; settlement: { month: number; day: number } }
type Doc = { levies: Levy[]; household?: unknown } & Record<string, unknown>

/** The plan's document with its tax Levy settling in May, as a hand edit would leave it. */
async function handEdited(home: string): Promise<Doc> {
	const document = (await shown(home)).document as Doc
	const levies = document.levies.map((levy) =>
		levy.id === "th-2026-pit" ? { ...levy, settlement: { ...levy.settlement, month: 5 } } : levy,
	)
	return { ...document, levies }
}

async function expectCleared(home: string, name = "base"): Promise<void> {
	const plan = await shown(home, name)
	expect(plan.tax).toBeNull()
	expect(plan.taxed).toBe(true)
	for (const argv of [["--from-stored"], ["--merge", "--children", "2"]]) {
		const res = await tax(home, [name, ...argv])
		expect(res.code).toBe(2)
		expect(errorOf(res).message).toContain("changed by hand since")
	}
	expect((await shown(home, name)).contentHash).toBe(plan.contentHash)
}

describe("the stored profile follows the Levy through apply", () => {
	it("clears the profile when an apply edits the Levy by hand", async () => {
		const home = await taxedHome()
		const edited = await handEdited(home)
		expect((await applyScenario(home, "base", edited)).code).toBe(0)
		await expectCleared(home)
	})

	it("keeps the profile when an apply leaves the Levy as it was", async () => {
		const home = await taxedHome()
		const before = await shown(home)
		const document = { ...(before.document as Doc), economy: { inflation: 100 } }
		expect((await applyScenario(home, "base", document)).code).toBe(0)
		expect((await shown(home)).tax).toEqual(before.tax)
		expect((await tax(home, ["base", "--merge", "--children", "2"])).code).toBe(0)
	})

	it("clears the profile when apply --set changes a Levy field", async () => {
		const home = await taxedHome()
		const res = await scenario(home, [
			"apply",
			"base",
			"--set",
			"levies.th-2026-pit.settlement.month=5",
		])
		expect(res.code).toBe(0)
		await expectCleared(home)
	})
})

describe("the stored profile follows the Levy through fork", () => {
	it("clears the profile of a fork whose --set changes a Levy field", async () => {
		const home = await taxedHome()
		const res = await scenario(home, [
			"fork",
			"base",
			"forked",
			"--set",
			"levies.th-2026-pit.settlement.month=5",
		])
		expect(res.code).toBe(0)
		await expectCleared(home, "forked")
		expect((await shown(home)).tax).not.toBeNull()
	})

	it("keeps the profile of a fork whose --set leaves the Levy alone", async () => {
		const home = await taxedHome()
		const res = await scenario(home, ["fork", "base", "forked", "--set", "economy.inflation=100"])
		expect(res.code).toBe(0)
		expect((await shown(home, "forked")).tax).toEqual((await shown(home)).tax)
	})
})
