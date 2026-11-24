import { describe, expect, it } from "bun:test"
import { backupPath } from "../backup/testing"
import { applyScenario, resultOf, scenario } from "../scenario-test-support"
import { ledgerHome, must, mustOpen, SCENARIO_DOCUMENT, tempHome } from "../store/testing"
import { capture } from "../test-support"
import { exportJsonl, importJsonl } from "./index"
import { goldenJsonl } from "./testing"

/** A data directory with one taxed plan, whose profile is stored, and one plan with none. */
async function homeWithTax(): Promise<string> {
	const home = ledgerHome()
	await applyScenario(home, "plain", SCENARIO_DOCUMENT)
	await applyScenario(home, "base", SCENARIO_DOCUMENT)
	const set = await scenario(home, [
		"tax",
		"base",
		"--tax",
		"th-2026",
		"--children",
		"1",
		"--mortgage-interest",
		"30000",
		"--label",
		"salary=income.section40_1",
		"--label",
		"bonus=income.section40_1",
	])
	expect(set.code).toBe(0)
	return home
}

describe("a tax profile through backup and restore", () => {
	it("carries a stored profile and an absent one into a restored database", async () => {
		const home = await homeWithTax()
		const backup = backupPath()
		expect((await capture(["backup", "--out", backup, "--json"], { TRAJ_HOME: home })).code).toBe(0)
		const restored = tempHome()
		expect((await capture(["restore", backup, "--json"], { TRAJ_HOME: restored })).code).toBe(0)
		const taxed = resultOf(await scenario(restored, ["show", "base"])).scenario
		expect(taxed.tax).toEqual({
			tax: "th-2026",
			filingStatus: "single",
			children: 1,
			childrenAtHigherRate: 0,
			mortgageInterest: 30000,
		})
		expect(taxed.taxed).toBe(true)
		const plain = resultOf(await scenario(restored, ["show", "plain"])).scenario
		expect(plain.tax).toBeNull()
		expect(plain.taxed).toBe(false)
	})

	it("writes the profile into the export as canonical JSON, with its keys sorted", async () => {
		const home = await homeWithTax()
		const out = backupPath()
		await capture(["export", "--format", "jsonl", "--out", out, "--json"], { TRAJ_HOME: home })
		const text = await Bun.file(`${out}/traj.jsonl`).text()
		const lines = text.split("\n").filter((line) => line.includes('"record":"scenario"'))
		expect(lines.some((line) => line.endsWith(',"tax":null}'))).toBe(true)
		expect(text).toContain(
			'"tax":{"children":1,"childrenAtHigherRate":0,"filingStatus":"single","mortgageInterest":30000,"tax":"th-2026"}}',
		)
	})

	it("restores a version 3 backup, which has no tax column, with every profile null", async () => {
		const current = await goldenJsonl()
		const version3 = current
			.replace('"schemaVersion":4', '"schemaVersion":3')
			.replaceAll(',"tax":null}', "}")
		const store = mustOpen(ledgerHome())
		expect(must(importJsonl(version3, store))).toEqual({
			entity: 1,
			account: 7,
			tx: 4,
			posting: 8,
			scenario: 3,
		})
		expect(must(exportJsonl(store))).toBe(current)
		store.close()
	})

	it("refuses a record whose profile is not one this build stores, at its path", async () => {
		const current = await goldenJsonl()
		const bad = current.replace(
			'"household":null,"tax":null}',
			'"household":null,"tax":{"tax":"th-2026","children":-1}}',
		)
		const store = mustOpen(ledgerHome())
		const refused = importJsonl(bad, store)
		expect(refused).toMatchObject({ body: { code: "invalid_input" } })
		store.close()
	})

	it("refuses a profile beside a document with no tax Levy, at its path", async () => {
		const home = await homeWithTax()
		const out = backupPath()
		await capture(["export", "--format", "jsonl", "--out", out, "--json"], { TRAJ_HOME: home })
		const text = await Bun.file(`${out}/traj.jsonl`).text()
		const lines = text.split("\n").map((line) => {
			if (!line.includes('"record":"scenario"') || !line.includes('"tax":{')) return line
			const record = JSON.parse(line) as {
				document: { levies?: unknown; flows: Record<string, unknown>[] }
			}
			delete record.document.levies
			for (const flow of record.document.flows) delete flow["label"]
			return JSON.stringify(record)
		})
		const store = mustOpen(ledgerHome())
		const refused = importJsonl(lines.join("\n"), store)
		expect(refused).toMatchObject({
			body: { code: "invalid_input", message: expect.stringContaining("holds no tax Levy") },
		})
		store.close()
	})
})
