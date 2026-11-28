import { describe, expect, it } from "bun:test"
import { backupPath } from "../backup/testing"
import { applyScenario, resultOf, scenario } from "../scenario-test-support"
import { ledgerHome, must, mustOpen, SCENARIO_DOCUMENT, tempHome } from "../store/testing"
import { capture } from "../test-support"
import { exportJsonl, importJsonl } from "./index"
import { GOLDEN_NOTES, goldenJsonl, goldenStore, goldenWithoutNotes } from "./testing"

const NOTES = "Retire at 55.\n\tSell the condo in 2031. ก"

/** A data directory with two plans: `base` has notes and is the main plan, `early` has neither. */
async function homeWithNotesAndMain(): Promise<string> {
	const home = ledgerHome()
	await applyScenario(home, "base", SCENARIO_DOCUMENT)
	await applyScenario(home, "early", SCENARIO_DOCUMENT)
	expect((await scenario(home, ["notes", "base", "--text", NOTES])).code).toBe(0)
	expect((await scenario(home, ["main", "base"])).code).toBe(0)
	return home
}

const MAIN_LINE = `,"notes":${JSON.stringify(GOLDEN_NOTES)},"main":true,"unstated":null}`

describe("notes and the main plan through backup and restore (cli ADR-0071)", () => {
	it("carries both into a restored database, with every version and hash", async () => {
		const home = await homeWithNotesAndMain()
		const before = resultOf(await scenario(home, ["list"])).scenarios
		const backup = backupPath()
		expect((await capture(["backup", "--out", backup, "--json"], { TRAJ_HOME: home })).code).toBe(0)
		const restored = tempHome()
		expect((await capture(["restore", backup, "--json"], { TRAJ_HOME: restored })).code).toBe(0)
		expect(resultOf(await scenario(restored, ["list"])).scenarios).toEqual(before)
		const base = resultOf(await scenario(restored, ["show", "base"])).scenario
		expect(base).toMatchObject({ notes: NOTES, main: true })
		expect(resultOf(await scenario(restored, ["show", "early"])).scenario).toMatchObject({
			notes: null,
			main: false,
		})
	})

	it("writes them into the export, and a restore exports the same bytes", async () => {
		const home = await homeWithNotesAndMain()
		const out = backupPath()
		await capture(["export", "--format", "jsonl", "--out", out, "--json"], { TRAJ_HOME: home })
		const text = await Bun.file(`${out}/traj.jsonl`).text()
		expect(text).toContain(`"notes":${JSON.stringify(NOTES)},"main":true,"unstated":null}`)
		const store = mustOpen(ledgerHome())
		must(importJsonl(text, store))
		expect(must(exportJsonl(store))).toBe(text)
		store.close()
	})

	it("round-trips the golden export, whose base has notes and is the main plan", async () => {
		const golden = await goldenJsonl()
		expect(golden).toContain(MAIN_LINE)
		const store = mustOpen(ledgerHome())
		must(importJsonl(golden, store))
		expect(must(exportJsonl(store))).toBe(golden)
		expect(must(exportJsonl(await goldenStore()))).toBe(golden)
		store.close()
	})

	it("restores a schema 4 backup, which has neither, with no notes and no main plan", async () => {
		const current = await goldenWithoutNotes()
		const version4 = current
			.replace('"schemaVersion":6', '"schemaVersion":4')
			.replaceAll(',"notes":null,"main":false,"unstated":null}', "}")
		const store = mustOpen(ledgerHome())
		expect(must(importJsonl(version4, store))).toMatchObject({ scenario: 3 })
		expect(must(exportJsonl(store))).toBe(current)
		store.close()
	})

	it("refuses a second main plan, a deleted main plan and a main that is not a boolean", async () => {
		const golden = await goldenJsonl()
		const second = golden.replace(
			',"notes":null,"main":false,"unstated":null}',
			',"notes":null,"main":true,"unstated":null}',
		)
		const deleted = golden.replace(
			'"deletedAt":"2026-02-04T10:00:00.040Z","household":null,"tax":null,"notes":null,"main":false,"unstated":null}',
			'"deletedAt":"2026-02-04T10:00:00.040Z","household":null,"tax":null,"notes":null,"main":true,"unstated":null}',
		)
		const text = golden.replace(',"main":true,', ',"main":"yes",')
		const messages = [
			[second, "a ledger has one main plan"],
			[deleted, "a deleted scenario is not the main plan"],
			[text, "must be true or false"],
		] as const
		for (const [source, message] of messages) {
			const store = mustOpen(ledgerHome())
			const refused = importJsonl(source, store)
			expect(refused).toMatchObject({
				body: { code: "invalid_input", message: expect.stringContaining(message) },
			})
			expect(must(store.dump()).scenario).toEqual([])
			store.close()
		}
	})

	it("refuses notes this build would not store", async () => {
		const golden = await goldenJsonl()
		const encoded = JSON.stringify(GOLDEN_NOTES)
		const bad = [
			[JSON.stringify("bell\u0007"), "control character"],
			[JSON.stringify("x".repeat(10_001)), "at most 10000 characters"],
			[JSON.stringify(""), "cannot be empty"],
			["7", "must be a string or null"],
		] as const
		for (const [notes, message] of bad) {
			const store = mustOpen(ledgerHome())
			const refused = importJsonl(golden.replace(encoded, notes), store)
			expect(refused).toMatchObject({
				body: { code: "invalid_input", message: expect.stringContaining(message) },
			})
			store.close()
		}
	})
})
