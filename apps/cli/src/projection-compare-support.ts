import { expect } from "bun:test"
import simPackage from "../package.json"
import { goldenTextIn, recordGoldenTextIn } from "./golden-test-support"
import type { CompareAnnualRow } from "./projection/compare-annual-view"
import type { CompareView } from "./projection/compare-view"
import type { Captured } from "./test-support"

/*
 * Helpers the compare-change tests share (cli ADR-0049, amended): the parsed body, the annual rows,
 * and the golden check. A golden is re-baselined with TRAJ_UPDATE_GOLDEN=1, never by an ordinary run.
 */

export const GOLDENS: URL = new URL("./projection/fixtures/", import.meta.url)
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g
const REBASELINE = "TRAJ_UPDATE_GOLDEN=1 bun test src/projection-compare-goldens.test.ts"

export function bodyOf(res: Captured): CompareView {
	return JSON.parse(res.out) as CompareView
}

/** The annual rows of a compare, in index order. */
export function annualRows(body: CompareView): CompareAnnualRow[] {
	const table = body.tables.find((entry) => entry.name === "annual")
	if (table === undefined) throw new Error("The compare has no annual table.")
	return table.rows
}

/** The command's own bytes, with every minted Scenario id replaced by a stable token. */
function goldenText(res: Captured): string {
	return `${res.out.replace(UUID, "the-scenario-id")}\n`
}

/** Compares the command's bytes with the committed golden; a re-baseline writes them first. */
export async function expectGolden(name: string, res: Captured): Promise<void> {
	expect(res.code).toBe(0)
	expect(res.err).toBe("")
	const text = goldenText(res)
	await recordGoldenTextIn(GOLDENS, name, text)
	let recorded: string
	try {
		recorded = await goldenTextIn(GOLDENS, name)
	} catch {
		throw new Error(`The golden ${name} is missing. Record it deliberately: ${REBASELINE}`)
	}
	// The engine version is checked before the bytes, so a bump fails with the re-baseline command.
	const { engine } = JSON.parse(recorded) as { engine: { version: string } }
	if (engine.version !== simPackage.version) {
		throw new Error(
			`The golden ${name} was produced with @trajectonomics/cli ${engine.version}, but ${simPackage.version} is installed. Re-baseline it deliberately: ${REBASELINE}`,
		)
	}
	expect(recorded).toBe(text)
}
