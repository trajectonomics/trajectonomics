// The tax profile `scenario tax` keeps beside the Scenario, read back by `scenario show`, kept by
// fork and apply, and guarded by `--if-hash` (cli ADR-0066).
import { describe, expect, it } from "bun:test"
import { projectionHome } from "./projection/testing"
import { SALARY, shown, tax, taxedHome } from "./scenario-tax-profile-support"
import { applyScenario, errorOf, resultOf, scenario } from "./scenario-test-support"

describe("scenario tax keeps the profile", () => {
	it("stores the flags it was given, normalised, and show and list read them back", async () => {
		const home = await taxedHome()
		const plan = await shown(home)
		expect(plan.tax).toEqual({
			tax: "th-2026",
			filingStatus: "married_joint",
			children: 1,
			childrenAtHigherRate: 0,
			mortgageInterest: 30000,
		})
		expect(plan.taxed).toBe(true)
		const listed = resultOf(await scenario(home, ["list"])).scenarios as {
			name: string
			taxed: boolean
		}[]
		expect(listed.find((it) => it.name === "base")?.taxed).toBe(true)
	})

	it("leaves a plan that was never taxed with no profile and taxed false", async () => {
		const home = await projectionHome()
		const plan = await shown(home)
		expect(plan.tax).toBeNull()
		expect(plan.taxed).toBe(false)
	})

	it("states a deduction of zero by leaving it out", async () => {
		const home = await projectionHome()
		await tax(home, ["base", "--tax", "th-2026", "--mortgage-interest", "0", ...SALARY])
		expect((await shown(home)).tax).toEqual({
			tax: "th-2026",
			filingStatus: "single",
			children: 0,
			childrenAtHigherRate: 0,
		})
	})
})

describe("scenario tax --none, fork, rm and apply", () => {
	it("removes the Levy and the profile together", async () => {
		const home = await taxedHome()
		expect((await tax(home, ["base", "--none"])).code).toBe(0)
		const plan = await shown(home)
		expect(plan.tax).toBeNull()
		expect(plan.taxed).toBe(false)
		expect(plan.document.levies).toBeUndefined()
	})

	it("copies the profile to a fork, and a removed plan takes it with the row", async () => {
		const home = await taxedHome()
		const forked = await scenario(home, ["fork", "base", "early"])
		expect(forked.code).toBe(0)
		expect((await shown(home, "early")).tax).toEqual((await shown(home)).tax)
		expect((await scenario(home, ["rm", "early"])).code).toBe(0)
		await applyScenario(home, "early", (await shown(home)).document)
		expect((await shown(home, "early")).tax).toBeNull()
	})

	it("keeps the profile while an apply leaves the Levy, and drops it when the apply takes the Levy out", async () => {
		const home = await taxedHome()
		const plan = await shown(home)
		const kept = await applyScenario(home, "base", {
			...plan.document,
			economy: { inflation: 100 },
		})
		expect(kept.code).toBe(0)
		expect((await shown(home)).tax).toEqual(plan.tax)
		const { levies: _levies, ...bare } = plan.document as Record<string, unknown>
		const flows = (bare["flows"] as Record<string, unknown>[]).map(
			({ label: _label, ...flow }) => flow,
		)
		const dropped = await applyScenario(home, "base", { ...bare, flows })
		expect(dropped.code).toBe(0)
		const after = await shown(home)
		expect(after.tax).toBeNull()
		expect(after.taxed).toBe(false)
	})
})

describe("scenario tax --if-hash", () => {
	it("refuses a write over a plan that moved on, dry or real, and writes nothing", async () => {
		const home = await taxedHome()
		const read = await shown(home)
		await applyScenario(home, "base", { ...read.document, economy: { inflation: 100 } })
		const moved = await shown(home)
		for (const extra of [[], ["--dry-run"]]) {
			const res = await tax(home, [
				"base",
				"--merge",
				"--children",
				"3",
				"--if-hash",
				read.contentHash,
				...extra,
			])
			expect(res.code).toBe(5)
			expect(errorOf(res)).toMatchObject({
				code: "scenario_changed",
				path: "--if-hash",
				details: { expectedHash: read.contentHash, storedHash: moved.contentHash },
			})
		}
		expect(await shown(home)).toEqual(moved)
	})

	it("writes over the plan it read, and --dry-run reports without writing", async () => {
		const home = await taxedHome()
		const read = await shown(home)
		const dry = await tax(home, [
			"base",
			"--merge",
			"--children",
			"3",
			"--if-hash",
			read.contentHash,
			"--dry-run",
		])
		expect(resultOf(dry)).toMatchObject({ dryRun: true, status: "updated" })
		expect((await shown(home)).tax?.["children"]).toBe(1)
		const written = await tax(home, [
			"base",
			"--merge",
			"--children",
			"3",
			"--if-hash",
			read.contentHash,
		])
		expect(written.code).toBe(0)
		expect((await shown(home)).tax?.["children"]).toBe(3)
	})
})

describe("traj schema scenario tax", () => {
	it("publishes --merge, --from-stored and --if-hash, and show publishes the profile", async () => {
		const { capture } = await import("./test-support")
		const res = await capture(["schema", "scenario", "tax", "--json"])
		const input = JSON.parse(res.out).input.properties
		expect(input.merge.flag).toBe("--merge")
		expect(input.fromStored.flag).toBe("--from-stored")
		expect(input.ifHash.flag).toBe("--if-hash")
		const show = JSON.parse((await capture(["schema", "scenario", "show", "--json"])).out)
		const tax = show.output.properties.scenario.properties.tax
		expect(JSON.stringify(tax)).toContain("childrenAtHigherRate")
		expect(show.output.properties.scenario.properties.taxed).toBeDefined()
	})
})
