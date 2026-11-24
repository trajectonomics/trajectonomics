import { describe, expect, it } from "bun:test"
import {
	applyScenario,
	errorOf,
	resultOf,
	rowOf,
	scenario,
	scenarioHome,
} from "./scenario-test-support"
import { SCENARIO_DOCUMENT } from "./store/testing"

const TAX = [
	"tax",
	"base",
	"--tax",
	"th-2026",
	"--label",
	"salary=income.section40_1",
	"--label",
	"bonus=income.section40_1",
]

describe("scenario rename (cli ADR-0071)", () => {
	it("renames in place: the same id, document and hash, one version more", async () => {
		const home = scenarioHome()
		await applyScenario(home, "early", SCENARIO_DOCUMENT)
		const before = resultOf(await scenario(home, ["show", "early"])).scenario
		const res = await scenario(home, ["rename", "early", "retire-at-55"])
		expect(res.code).toBe(0)
		const data = resultOf(res)
		expect(data).toMatchObject({ dryRun: false, status: "renamed", previousName: "early" })
		const row = rowOf(data)
		expect(row).toMatchObject({
			id: before.id,
			name: "retire-at-55",
			contentHash: before.contentHash,
			forkedFrom: before.forkedFrom,
			createdAt: before.createdAt,
			version: before.version + 1,
			document: before.document,
		})
		expect(row.updatedAt >= before.updatedAt).toBe(true)
		const list = resultOf(await scenario(home, ["list"])).scenarios
		expect(list.map((s: { name: string }) => s.name)).toEqual(["retire-at-55"])
		expect((await scenario(home, ["show", "early"])).code).toBe(4)
	})

	it("keeps the household and the stored tax profile", async () => {
		const home = scenarioHome()
		await applyScenario(home, "base", SCENARIO_DOCUMENT)
		expect((await scenario(home, TAX)).code).toBe(0)
		const before = resultOf(await scenario(home, ["show", "base"])).scenario
		expect((await scenario(home, ["rename", "base", "main-case"])).code).toBe(0)
		const after = resultOf(await scenario(home, ["show", "main-case"])).scenario
		expect(after).toMatchObject({
			id: before.id,
			contentHash: before.contentHash,
			tax: before.tax,
			household: before.household,
			taxed: true,
		})
		expect(after.tax).not.toBeNull()
	})

	it("resolves the plan by id", async () => {
		const home = scenarioHome()
		const created = rowOf(resultOf(await applyScenario(home, "early", SCENARIO_DOCUMENT)))
		const res = await scenario(home, ["rename", created.id as string, "later"])
		expect(rowOf(resultOf(res)).name).toBe("later")
	})

	it("refuses a name another live plan holds, and changes nothing", async () => {
		const home = scenarioHome()
		const base = rowOf(resultOf(await applyScenario(home, "base", SCENARIO_DOCUMENT)))
		await applyScenario(home, "early", SCENARIO_DOCUMENT)
		const res = await scenario(home, ["rename", "early", "base"])
		expect(res.code).toBe(5)
		expect(errorOf(res)).toMatchObject({
			code: "scenario_name_taken",
			details: { scenarioId: base.id },
		})
		expect(rowOf(resultOf(await scenario(home, ["show", "early"]))).version).toBe(1)
	})

	it("reuses the name of a plan that was removed", async () => {
		const home = scenarioHome()
		await applyScenario(home, "base", SCENARIO_DOCUMENT)
		await applyScenario(home, "early", SCENARIO_DOCUMENT)
		await scenario(home, ["rm", "base"])
		expect((await scenario(home, ["rename", "early", "base"])).code).toBe(0)
	})

	it("refuses an empty name, a UUID-shaped one and one over 100 characters", async () => {
		const home = scenarioHome()
		await applyScenario(home, "early", SCENARIO_DOCUMENT)
		const uuid = "0194c000-0001-7000-8000-000000000001"
		for (const name of ["", uuid, "x".repeat(101), "ก".repeat(101)]) {
			const res = await scenario(home, ["rename", "early", name])
			expect(res.code).toBe(2)
			expect(errorOf(res)).toMatchObject({ code: "invalid_input" })
		}
		const long = errorOf(await scenario(home, ["rename", "early", "x".repeat(101)]))
		expect(long.path).toBe("name")
		expect(long.message).toContain("at most 100 characters")
		expect((await scenario(home, ["rename", "early", "x".repeat(100)])).code).toBe(0)
	})

	it("is true already when the name is the same: exit 0, nothing written", async () => {
		const home = scenarioHome()
		await applyScenario(home, "early", SCENARIO_DOCUMENT)
		const res = await scenario(home, ["rename", "early", "early"])
		expect(res.code).toBe(0)
		expect(resultOf(res).status).toBe("unchanged")
		expect(rowOf(resultOf(res)).version).toBe(1)
	})

	it("rolls back under --dry-run and reports the row it would write", async () => {
		const home = scenarioHome()
		await applyScenario(home, "early", SCENARIO_DOCUMENT)
		const res = await scenario(home, ["rename", "early", "later", "--dry-run"])
		expect(resultOf(res)).toMatchObject({ dryRun: true, status: "renamed" })
		expect(rowOf(resultOf(res))).toMatchObject({ name: "later", version: 2 })
		expect(rowOf(resultOf(await scenario(home, ["show", "early"]))).version).toBe(1)
	})

	it("refuses a stale --if-hash and accepts the hash it read", async () => {
		const home = scenarioHome()
		const created = rowOf(resultOf(await applyScenario(home, "early", SCENARIO_DOCUMENT)))
		const stale = `jcs1:sha256:${"0".repeat(64)}`
		const refused = await scenario(home, ["rename", "early", "later", "--if-hash", stale])
		expect(refused.code).toBe(5)
		expect(errorOf(refused).code).toBe("scenario_changed")
		const ok = await scenario(home, ["rename", "early", "later", "--if-hash", created.contentHash])
		expect(ok.code).toBe(0)
	})

	it("reports a plan that does not exist as not_found", async () => {
		const res = await scenario(scenarioHome(), ["rename", "nope", "later"])
		expect(res.code).toBe(4)
		expect(errorOf(res).code).toBe("not_found")
	})
})
