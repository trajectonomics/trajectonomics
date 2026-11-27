// The 12-month ledger the guided plan tests write to, built through the workspace's own traj (web ADR 0031):
// a salary, a food account and a bank, with a whole year of months ending at the last full month before the As-of.
import { mkdir } from "node:fs/promises"
import { join } from "node:path"
import { BINARY } from "./edit-fixture.test-support"
import { makeScratch, removeScratch } from "./scratch"
import { spawnCapture } from "./spawn"

/** The Snapshot's As-of: the first day after the twelve recorded months. */
export const AS_OF = "2026-11-15"

/** The twelve whole months the fixture records, in order. */
const MONTHS = [
	"2025-11",
	"2025-12",
	"2026-01",
	"2026-02",
	"2026-03",
	"2026-04",
	"2026-05",
	"2026-06",
	"2026-07",
	"2026-08",
	"2026-09",
	"2026-10",
]

let scratch = ""
let home = ""

/** The scratch data directory of the 12-month ledger. */
export function guidedHome(): string {
	return home
}

/** The environment every traj call and Edit runs in: the scratch ledger, and no usage telemetry. */
export function guidedEnv(): Record<string, string | undefined> {
	return { ...process.env, TRAJ_HOME: home, DO_NOT_TRACK: "1" }
}

/** Runs one traj call and answers its stdout, or throws the CLI's own message. */
export async function trajText(argv: string[], stdin?: string): Promise<string> {
	const captured = await spawnCapture([BINARY, ...argv], { env: guidedEnv(), stdin })
	if (captured.code !== 0) throw new Error(captured.stderr.trim() || captured.stdout.trim())
	return captured.stdout
}

/** The three accounts the ledger opens, by name and type. */
const ACCOUNTS: readonly (readonly [string, string])[] = [
	["Salary", "income"],
	["Food", "expense"],
	["Bank", "asset"],
]

/** Builds the ledger once: three accounts, and 50,000 in and 15,000 out every month, from the first. */
export async function setupGuidedLedger(): Promise<string> {
	if (home !== "") return home
	scratch = await makeScratch("traj-web-guided-")
	home = join(scratch, "traj-home")
	await mkdir(home, { recursive: true })
	await trajText(["init"])
	for (const [name, type] of ACCOUNTS) {
		await trajText(["account", "add", name, "--type", type, "--currency", "THB"])
	}
	for (const [index, month] of MONTHS.entries()) {
		const day = index === 0 ? "01" : "05"
		await trajText([
			"tx",
			"add",
			"--from",
			"Salary",
			"--to",
			"Bank",
			"--amount",
			"50000",
			"--date",
			`${month}-${day}`,
		])
		await trajText([
			"tx",
			"add",
			"--from",
			"Bank",
			"--to",
			"Food",
			"--amount",
			"15000",
			"--date",
			`${month}-20`,
		])
	}
	return home
}

/** Removes the scratch ledger, so the next test file builds its own. */
export async function disposeGuidedLedger(): Promise<void> {
	if (scratch === "") return
	await removeScratch(scratch)
	scratch = ""
	home = ""
}
