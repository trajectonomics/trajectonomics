// The unstated column travels through export and restore, and a bad entry is refused (cli ADR-0084).
import { describe, expect, it } from "bun:test"
import { join } from "node:path"
import { backupPath } from "../backup/testing"
import { projectionHome } from "../projection/testing"
import { scenario } from "../scenario-test-support"
import { ledgerHome, must, mustOpen } from "../store/testing"
import { capture } from "../test-support"
import { exportJsonl, importJsonl } from "./index"
import { goldenJsonl, refused } from "./testing"

const AS_OF = "2026-03-31"

/** A home whose `start` plan was written by the template form. */
async function templateHome(): Promise<string> {
	const home = await projectionHome()
	const res = await scenario(home, ["apply", "start", "--template", "--as-of", AS_OF])
	expect(res.code).toBe(0)
	return home
}

/** The golden export with one Scenario record's unstated entry. */
async function goldenWithUnstated(): Promise<string> {
	const golden = await goldenJsonl()
	const entry = '[{"path":"economy.inflation","source":"template"}]'
	return golden.replace(',"unstated":null}', `,"unstated":${entry}}`)
}

describe("unstated through interchange and restore", () => {
	it("keeps the list through an export and a restore", async () => {
		const home = await templateHome()
		const out = backupPath()
		const exported = await capture(["export", "--format", "jsonl", "--out", out, "--json"], {
			TRAJ_HOME: home,
		})
		expect(exported.code).toBe(0)
		const text = await Bun.file(join(out, "traj.jsonl")).text()
		expect(text).toContain(',"unstated":[{"path":"accounts.')
		expect(text).toContain('{"path":"economy.inflation","source":"template"}')
		const store = mustOpen(ledgerHome())
		expect(importJsonl(text, store)).toMatchObject({ scenario: 7 })
		expect(exportJsonl(store)).toBe(text)
		store.close()
	})

	it("restores a schema 5 backup with unstated NULL", async () => {
		const golden = await goldenJsonl()
		const version5 = golden
			.replace('"schemaVersion":6', '"schemaVersion":5')
			.replaceAll(',"unstated":null}', "}")
		const store = mustOpen(ledgerHome())
		expect(importJsonl(version5, store)).toMatchObject({ scenario: 3 })
		expect(exportJsonl(store)).toBe(golden)
		expect(must(store.dump()).scenario.every((row) => row.unstated === null)).toBe(true)
		store.close()
	})

	it("refuses an unknown source, an empty path and a duplicate path, at the record's path", async () => {
		const text = await goldenWithUnstated()
		const line = text.split("\n").findIndex((entry) => entry.includes('"record":"scenario"'))
		const path = `line.${line + 1}.unstated`
		const bad = [
			'[{"path":"economy.inflation","source":"form"}]',
			'[{"path":"","source":"template"}]',
			'[{"path":"economy.inflation","source":"template"},{"path":"economy.inflation","source":"template"}]',
		]
		for (const unstated of bad) {
			const body = refused(text.replace(/,"unstated":\[.*?\]\}/, `,"unstated":${unstated}}`))
			expect(body).toMatchObject({ code: "invalid_input", path })
		}
	})
})
