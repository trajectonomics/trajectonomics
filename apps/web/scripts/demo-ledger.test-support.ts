// Builds the fictional demo ledger once per binary in a process-level scratch template and copies it into each
// test's own scratch TRAJ_HOME. Every test still writes to an isolated SQLite copy; demo-run.ts keeps calling
// buildDemoLedger directly so regeneration tests still run a fresh build.
import { cp, readdir, rm } from "node:fs/promises"
import { join } from "node:path"
import type { DemoAccountIds } from "./demo/scenario"
import { buildDemoLedger, type DemoLedgerPlace } from "./demo-ledger"
import { makeScratch, removeScratch } from "./scratch"

type Template = { home: string; ids: DemoAccountIds }

const templates = new Map<string, Promise<Template>>()

function templateFor(binary: string): Promise<Template> {
	const existing = templates.get(binary)
	if (existing !== undefined) return existing
	const pending = (async (): Promise<Template> => {
		const scratch = await makeScratch("traj-web-demo-template-")
		const home = join(scratch, "traj-home")
		try {
			const ids = await buildDemoLedger({ binary, home, scratch })
			const files = await readdir(home)
			const sidecars = files.filter((file) => file.endsWith("-wal") || file.endsWith("-shm"))
			if (sidecars.length > 0) {
				throw new Error(`demo ledger template left uncheckpointed sidecars: ${sidecars.join(", ")}`)
			}
			return { home, ids }
		} catch (error) {
			templates.delete(binary)
			await removeScratch(scratch)
			throw error
		}
	})()
	templates.set(binary, pending)
	return pending
}

/** Copies the memoized demo ledger template into `place.home` and returns its account ids. */
export async function copyDemoLedger(place: DemoLedgerPlace): Promise<DemoAccountIds> {
	const template = await templateFor(place.binary)
	await rm(place.home, { recursive: true, force: true })
	await cp(template.home, place.home, { recursive: true })
	return { ...template.ids }
}
