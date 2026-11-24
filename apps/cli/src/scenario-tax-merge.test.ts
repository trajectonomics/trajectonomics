// `scenario tax --merge` and `--from-stored` build on the stored tax profile (cli ADR-0066).
import { describe, expect, it } from "bun:test"
import { projectionHome } from "./projection/testing"
import { SALARY, shown, tax, taxedHome } from "./scenario-tax-profile-support"
import { applyScenario, errorOf, resultOf } from "./scenario-test-support"

describe("scenario tax --merge", () => {
	it("changes one item and keeps the rest, giving the document a whole write would", async () => {
		const home = await taxedHome()
		const merged = await tax(home, ["base", "--merge", "--children", "2"])
		expect(merged.code).toBe(0)
		expect((await shown(home)).tax).toEqual({
			tax: "th-2026",
			filingStatus: "married_joint",
			children: 2,
			childrenAtHigherRate: 0,
			mortgageInterest: 30000,
		})
		const whole = await projectionHome()
		await tax(whole, [
			"base",
			"--tax",
			"th-2026",
			"--filing-status",
			"married_joint",
			"--children",
			"2",
			"--mortgage-interest",
			"30000",
			...SALARY,
		])
		expect((await shown(home)).contentHash).toBe((await shown(whole)).contentHash)
	})

	it("takes one deduction out when it is stated as zero", async () => {
		const home = await taxedHome()
		await tax(home, ["base", "--merge", "--mortgage-interest", "0"])
		const plan = await shown(home)
		expect(plan.tax).toEqual({
			tax: "th-2026",
			filingStatus: "married_joint",
			children: 1,
			childrenAtHigherRate: 0,
		})
	})

	it("refuses a merged profile the engine would not read, at the flag", async () => {
		const home = await taxedHome()
		await tax(home, ["base", "--merge", "--children", "2", "--children-at-higher-rate", "2"])
		const res = await tax(home, ["base", "--merge", "--children", "1"])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: "--children-at-higher-rate" })
	})

	it("checks --children-at-higher-rate against the stored children, not the flags alone", async () => {
		const home = await taxedHome()
		await tax(home, ["base", "--merge", "--children", "3"])
		const merged = await tax(home, ["base", "--merge", "--children-at-higher-rate", "2"])
		expect(merged.code).toBe(0)
		expect(await shown(home)).toMatchObject({
			tax: { children: 3, childrenAtHigherRate: 2 },
		})
		const refused = await tax(home, ["base", "--merge", "--children", "1"])
		expect(refused.code).toBe(2)
		expect(errorOf(refused)).toMatchObject({ path: "--children-at-higher-rate" })
	})

	it("takes --tax only when it names the stored jurisdiction", async () => {
		const home = await taxedHome()
		const same = await tax(home, ["base", "--merge", "--tax", "th-2026", "--children", "2"])
		expect(same.code).toBe(0)
		const other = await tax(home, ["base", "--merge", "--tax", "xx-2026", "--children", "3"])
		expect(other.code).toBe(2)
		expect((await shown(home)).tax).toMatchObject({ children: 2 })
	})

	it("refuses a plan with no stored profile and names the full form", async () => {
		const home = await projectionHome()
		const res = await tax(home, ["base", "--merge", "--children", "2"])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: "--merge" })
		expect(errorOf(res).hint).toContain("traj scenario tax <name> --tax th-2026")
		expect((await shown(home)).tax).toBeNull()
	})

	it("needs a flag to change, and takes none of --from-stored or --none", async () => {
		const home = await taxedHome()
		const cases: [string[], string][] = [
			[["--merge"], "--merge"],
			[["--merge", "--tax", "th-2026"], "--merge"],
			[["--merge", "--from-stored", "--children", "2"], "--from-stored"],
			[["--from-stored", "--children", "2"], "--from-stored"],
			[["--merge", "--none", "--children", "2"], "--none"],
			[["--from-stored", "--none"], "--none"],
		]
		for (const [argv, path] of cases) {
			const res = await tax(home, ["base", ...argv])
			expect(res.code).toBe(2)
			expect(errorOf(res)).toMatchObject({ code: "invalid_input", path })
		}
	})
})

describe("scenario tax --from-stored", () => {
	it("writes the Levy again from the profile, giving a byte-identical document", async () => {
		const home = await taxedHome()
		const before = await shown(home)
		const res = await tax(home, ["base", "--from-stored"])
		expect(res.code).toBe(0)
		expect(resultOf(res)).toMatchObject({ status: "unchanged", levy: "th-2026-pit" })
		const after = await shown(home)
		expect(after.contentHash).toBe(before.contentHash)
		expect(after.version).toBe(before.version)
	})

	it("refuses a plan taxed before the profile was kept, which has a Levy and no profile", async () => {
		const home = await taxedHome()
		const document = (await shown(home)).document
		await applyScenario(home, "legacy", document)
		const plan = await shown(home, "legacy")
		expect(plan.tax).toBeNull()
		expect(plan.taxed).toBe(true)
		for (const argv of [["--from-stored"], ["--merge", "--children", "2"]]) {
			const res = await tax(home, ["legacy", ...argv])
			expect(res.code).toBe(2)
			expect(errorOf(res).message).toContain("written before its profile was kept")
			expect(errorOf(res).hint).toContain("--tax th-2026")
		}
		expect((await shown(home, "legacy")).contentHash).toBe(plan.contentHash)
	})
})
