// The Overview's warning matcher against the sentences the real traj states (web ADR 0001): one
// scratch ledger, one Scenario per warning, and the CLI's own notes, so rewording `funding.ts`,
// `withdraw-notes.ts` or `levies.ts` fails here instead of quietly dropping a warning from the hero.
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
		const base = (
			extra: { flows?: unknown[]; contribute?: string[]; withdraw?: string[] } = {},
		): Record<string, unknown> => ({
			schemaVersion: 4,
			currency: "THB",
			economy: { inflation: 0 },
			accounts: [
				{ id: bank, kind: "asset", rate: 0 },
				{ id: vault, kind: "asset", rate: 0 },
			],
			flows: extra.flows ?? [],
			cashflow: {
				surplus: [{ account: bank }],
				contribute: extra.contribute ?? [],
				withdraw: extra.withdraw ?? [bank],
			},
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
		const invest = (amount: string) => ({
			id: "invest",
			kind: "contribution",
			target: vault,
			amount,
			frequency: "monthly",
			start: "2026-02-01",
			growth: { bps: 0 },
		})

		// No Levy at all: the CLI states that no tax is applied.
		store("untaxed", base())
		// A Contribution far beyond the day's income, so the engine could not fund it.
		store("unfunded", base({ flows: [invest("200000.00")], contribute: [vault] }))
		// One expense larger than the cash, with the Vault outside `cashflow.withdraw` and holding money.
		store(
			"unmet",
			base({
				flows: [
					{
						id: "big",
						kind: "expense",
						amount: "9000000.00",
						frequency: "once",
						start: "2026-02-01",
						growth: { bps: 0 },
					},
				],
			}),
		)
		// A salary that funds a small Contribution, for the compare whose side B cannot fund a large one.
		store("funded", base({ flows: [salary, invest("1.00")], contribute: [vault] }))
		// This build's Thai Levy: the CLI completes the earlier period with its own scope record, so it says tax before 2026 is not recomputed.
		store("taxed", base({ flows: [salary] }))
		traj(["scenario", "tax", "taxed", "--tax", "th-2026", "--label", "salary=income.section40_1"])
	}, SLOW_MS)

	afterAll(async () => {
		if (scratch !== "") await removeScratch(scratch)
	})

	test("counts the unfunded Contribution note", () => {
		const warnings = projectionNotes(["projection", "run", "--scenario", "unfunded"]).filter(
			isWarningNote,
		)
		expect(warnings.some((note) => note.includes("of Contributions could not be funded"))).toBe(
			true,
		)
	})

	test("counts the note of a side that could not fund a Contribution", () => {
		const warnings = projectionNotes([
			"projection",
			"compare",
			"funded",
			"--set",
			"flows.invest.amount=20000000",
		]).filter(isWarningNote)
		expect(warnings.some((note) => note.startsWith("Side B could not fund "))).toBe(true)
	})

	test("counts the unmet-amount note", () => {
		const warnings = projectionNotes(["projection", "run", "--scenario", "unmet"]).filter(
			isWarningNote,
		)
		expect(warnings.some((note) => note.includes(" unmet on 2026-02-01"))).toBe(true)
	})

	test("counts the no-tax note", () => {
		const warnings = projectionNotes(["projection", "run", "--scenario", "untaxed"]).filter(
			isWarningNote,
		)
		expect(warnings).toContain("No tax is applied; figures are before tax.")
	})

	test("counts the note that tax before a year is not recomputed", () => {
		const warnings = projectionNotes(["projection", "run", "--scenario", "taxed"]).filter(
			isWarningNote,
		)
		expect(warnings.some((note) => note.startsWith("Tax before 2026 is not recomputed;"))).toBe(
			true,
		)
	})
})
