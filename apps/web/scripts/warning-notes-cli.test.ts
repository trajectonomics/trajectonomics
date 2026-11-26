// The Overview's warning matcher against the sentences the real traj states (web ADR 0001): one
// scratch ledger, one Scenario per warning the Demo snapshot does not state, and the CLI's own notes,
// so rewording `withdraw-notes.ts` or `levies.ts` fails here instead of quietly dropping a warning
// from the hero. `demo-warning-notes.test.ts` guards the funding note through the Demo.
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { mkdir } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { isWarningNote } from "../src/lib/view/overview/warning-notes"
import { makeScratch, removeScratch } from "./scratch"

/** The workspace's own traj binary, built by `turbo run build --filter=@trajectonomics/cli`. */
const BINARY = fileURLToPath(new URL("../../cli/dist/traj", import.meta.url))
/** Building the scratch ledger takes about a dozen traj calls and seconds, but the runner may be slow. */
const SLOW_MS = 180_000

let scratch = ""
let home = ""

/** Runs one `traj` write or read against the scratch ledger, or throws its refusal. */
function traj(argv: string[], stdin?: string): unknown {
	const run = Bun.spawnSync([BINARY, ...argv, "--json"], {
		env: { ...process.env, TRAJ_HOME: home, DO_NOT_TRACK: "1" },
		...(stdin === undefined ? {} : { stdin: new Blob([stdin]) }),
	})
	if (run.exitCode !== 0) {
		throw new Error(`traj ${argv.join(" ")} failed: ${run.stderr.toString()}`)
	}
	return JSON.parse(run.stdout.toString())
}

/** One `projection` result's notes, over the year that starts the day the Scenario is built against. */
function projectionNotes(argv: string[]): string[] {
	const body = traj([...argv, "--as-of", "2026-01-01", "--horizon", "2027-12-31"]) as {
		notes: string[]
	}
	return body.notes
}

/** Stores a Scenario document, in the decimal form the tests write, under its name. */
function store(name: string, document: unknown): void {
	traj(["scenario", "apply", name, "--file", "-", "--decimal"], JSON.stringify(document))
}

describe("the warning matcher against the real traj notes", () => {
	beforeAll(async () => {
		scratch = await makeScratch("traj-web-warning-notes-")
		home = join(scratch, "home")
		await mkdir(home, { recursive: true })
		traj(["init"])
		for (const [name, type] of [
			["Bank", "asset"],
			["Vault", "asset"],
			["Opening", "equity"],
		] as const) {
			traj(["account", "add", name, "--type", type, "--currency", "THB"])
		}
		for (const [to, amount] of [
			["Bank", "1000.00"],
			["Vault", "5000.00"],
		] as const) {
			traj([
				"tx",
				"add",
				"--opening",
				"--from",
				"Opening",
				"--to",
				to,
				"--amount",
				amount,
				"--date",
				"2026-01-01",
			])
		}
		const accounts = (traj(["account", "list"]) as { accounts: { id: string; name: string }[] })
			.accounts
		const idOf = (name: string): string => {
			const found = accounts.find((account) => account.name === name)
			if (found === undefined) throw new Error(`the scratch ledger has no account ${name}`)
			return found.id
		}
		const bank = idOf("Bank")
		const vault = idOf("Vault")
		const base = (flows: unknown[] = []): Record<string, unknown> => ({
			schemaVersion: 4,
			currency: "THB",
			economy: { inflation: 0 },
			accounts: [
				{ id: bank, kind: "asset", rate: 0 },
				{ id: vault, kind: "asset", rate: 0 },
			],
			flows,
			cashflow: { surplus: [{ account: bank }], contribute: [], withdraw: [bank] },
		})
		const salary = {
			id: "salary",
			kind: "income",
			earned: true,
			amount: "1000.00",
			frequency: "monthly",
			start: "2026-01-01",
			growth: { bps: 0 },
		}

		// No Levy at all: the CLI states that no tax is applied.
		store("untaxed", base())
		// One expense larger than the cash, with the Vault outside `cashflow.withdraw` and holding money.
		store(
			"unmet",
			base([
				{
					id: "big",
					kind: "expense",
					amount: "9000000.00",
					frequency: "once",
					start: "2026-02-01",
					growth: { bps: 0 },
				},
			]),
		)
		// This build's Thai Levy: the CLI completes the earlier period with its own scope record, so it says tax before 2026 is not recomputed.
		store("taxed", base([salary]))
		traj(["scenario", "tax", "taxed", "--tax", "th-2026", "--label", "salary=income.section40_1"])
	}, SLOW_MS)

	afterAll(async () => {
		if (scratch !== "") await removeScratch(scratch)
	})

	test("counts the unmet-amount note", () => {
		const stated = / unmet on 2026-02-01/
		const notes = projectionNotes(["projection", "run", "--scenario", "unmet"])
		expect(notes).toContainEqual(expect.stringMatching(stated))
		expect(notes.filter(isWarningNote)).toContainEqual(expect.stringMatching(stated))
	})

	test("counts the no-tax note", () => {
		const stated = "No tax is applied; figures are before tax."
		const notes = projectionNotes(["projection", "run", "--scenario", "untaxed"])
		expect(notes).toContain(stated)
		expect(notes.filter(isWarningNote)).toContain(stated)
	})

	test("counts the note that tax before a year is not recomputed", () => {
		const stated = /^Tax before 2026 is not recomputed;/
		const notes = projectionNotes(["projection", "run", "--scenario", "taxed"])
		expect(notes).toContainEqual(expect.stringMatching(stated))
		expect(notes.filter(isWarningNote)).toContainEqual(expect.stringMatching(stated))
	})
})
