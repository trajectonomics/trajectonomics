import { describe, expect, it } from "bun:test"
import { backupPath } from "../backup/testing"
import { isAppError } from "../errors"
import { applyScenario, resultOf, rowOf, scenario } from "../scenario-test-support"
import { ledgerHome, must, mustOpen, SCENARIO_DOCUMENT, tempHome } from "../store/testing"
import { capture } from "../test-support"
import { exportJsonl, importJsonl } from "./index"
import { goldenStore, goldenWithoutNotes } from "./testing"

const HOUSEHOLD = {
	schemaVersion: 1,
	people: [{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 }],
	anchors: [{ path: "flows.salary.end", person: "me", age: 60 }],
}

/** The same household in version 2, with Owners (cli ADR-0076). */
const OWNED_HOUSEHOLD = {
	...HOUSEHOLD,
	schemaVersion: 2,
	owners: [
		{ path: "flows.salary", person: "me" },
		{ path: "flows.bonus", person: "shared" },
	],
}

/** A Ledger-free data directory whose one Scenario carries a household, through the commands. */
async function homeWithHousehold(household: unknown = HOUSEHOLD): Promise<string> {
	const home = ledgerHome()
	await applyScenario(home, "base", SCENARIO_DOCUMENT)
	const set = await scenario(home, ["household", "base", "--file", "-"], JSON.stringify(household))
	expect(set.code).toBe(0)
	return home
}

describe("a household through backup and restore", () => {
	it("carries the household, its anchored dates and every column into a restored database", async () => {
		const home = await homeWithHousehold()
		const backup = backupPath()
		expect((await capture(["backup", "--out", backup, "--json"], { TRAJ_HOME: home })).code).toBe(0)
		const restored = tempHome()
		const res = await capture(["restore", backup, "--json"], { TRAJ_HOME: restored })
		expect(res.code).toBe(0)
		const row = rowOf(resultOf(await scenario(restored, ["show", "base"])))
		expect(row.document["flows"]).toMatchObject([
			{ id: "salary", end: "2050-06-30" },
			{ id: "bonus" },
		])
		expect(resultOf(await scenario(restored, ["show", "base"])).scenario.household).toEqual(
			HOUSEHOLD,
		)
	})

	it("carries the owners of a version 2 household into a restored database", async () => {
		const home = await homeWithHousehold(OWNED_HOUSEHOLD)
		const backup = backupPath()
		expect((await capture(["backup", "--out", backup, "--json"], { TRAJ_HOME: home })).code).toBe(0)
		const restored = tempHome()
		expect((await capture(["restore", backup, "--json"], { TRAJ_HOME: restored })).code).toBe(0)
		expect(resultOf(await scenario(restored, ["show", "base"])).scenario.household).toEqual(
			OWNED_HOUSEHOLD,
		)
	})

	it("writes the owners into the export, and an import of it restores them", async () => {
		const home = await homeWithHousehold(OWNED_HOUSEHOLD)
		const out = backupPath()
		await capture(["export", "--format", "jsonl", "--out", out, "--json"], { TRAJ_HOME: home })
		const text = await Bun.file(`${out}/traj.jsonl`).text()
		const line = text.split("\n").find((entry) => entry.includes('"record":"scenario"')) ?? ""
		expect(line).toContain(
			'"owners":[{"path":"flows.salary","person":"me"},{"path":"flows.bonus","person":"shared"}]',
		)
		const store = mustOpen(ledgerHome())
		must(importJsonl(text, store))
		expect(must(exportJsonl(store))).toBe(text)
		store.close()
	})

	it("refuses an import whose household names an unknown person as an Owner", async () => {
		const home = await homeWithHousehold(OWNED_HOUSEHOLD)
		const out = backupPath()
		await capture(["export", "--format", "jsonl", "--out", out, "--json"], { TRAJ_HOME: home })
		const text = (await Bun.file(`${out}/traj.jsonl`).text()).replace(
			'"person":"me"},{"path":"flows.bonus"',
			'"person":"nobody"},{"path":"flows.bonus"',
		)
		const store = mustOpen(ledgerHome())
		const refused = importJsonl(text, store)
		expect(isAppError(refused)).toBe(true)
		if (isAppError(refused)) {
			expect(refused.body.code).toBe("invalid_input")
			expect(refused.body.message).toContain("is not a household document")
			expect(refused.body.message).toContain("nobody")
		}
		store.close()
	})

	it("writes the household into the export as canonical JSON, with its keys sorted", async () => {
		const home = await homeWithHousehold()
		const first = backupPath()
		await capture(["export", "--format", "jsonl", "--out", first, "--json"], { TRAJ_HOME: home })
		const text = await Bun.file(`${first}/traj.jsonl`).text()
		const scenarioLine = text.split("\n").find((line) => line.includes('"record":"scenario"')) ?? ""
		expect(scenarioLine).toContain(
			'"household":{"anchors":[{"age":60,"path":"flows.salary.end","person":"me"}],"people":',
		)
	})

	it("restores a version 2 backup, which has no household column, with the household null", async () => {
		const current = await goldenWithoutNotes()
		const version2 = current
			.replace('"schemaVersion":5', '"schemaVersion":2')
			.replaceAll(',"household":null,"tax":null,"notes":null,"main":false}', "}")
		const store = mustOpen(ledgerHome())
		expect(must(importJsonl(version2, store))).toEqual({
			entity: 1,
			account: 7,
			tx: 4,
			posting: 8,
			scenario: 3,
		})
		expect(must(exportJsonl(store))).toBe(current)
		store.close()
	})

	it("keeps a household that a version 3 export carries through an import", async () => {
		const source = await goldenStore()
		const text = must(exportJsonl(source))
		const restored = mustOpen(ledgerHome())
		must(importJsonl(text, restored))
		expect(must(exportJsonl(restored))).toBe(text)
	})
})
