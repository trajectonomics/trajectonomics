// The hero's success note against the sentence the real traj states (web ADR 0001): the hero quotes the
// CLI's note when it starts with SUCCESS_NOTE_PREFIX, so a reworded CLI sentence must fail here instead
// of quietly switching the page to its own fallback.
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { mkdir } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { SUCCESS_NOTE_PREFIX } from "../src/lib/view/overview/hero"
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

/** A plan a salary funds: a small Contribution the CLI makes, so it reports no unfunded Contribution. */
function fundedDocument(bank: string, vault: string): Record<string, unknown> {
	return {
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: 0 },
		accounts: [
			{ id: bank, kind: "asset", rate: 0 },
			{ id: vault, kind: "asset", rate: 0, volatility: 1500 },
		],
		flows: [
			{
				id: "salary",
				kind: "income",
				earned: true,
				amount: "1000.00",
				frequency: "monthly",
				start: "2026-01-01",
				growth: { bps: 0 },
			},
			{
				id: "invest",
				kind: "contribution",
				target: vault,
				amount: "1.00",
				frequency: "monthly",
				start: "2026-02-01",
				growth: { bps: 0 },
			},
		],
		cashflow: { surplus: [{ account: bank }], contribute: [vault], withdraw: [bank] },
	}
}

describe("the hero's success note against the real traj notes", () => {
	beforeAll(async () => {
		scratch = await makeScratch("traj-web-success-note-")
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
		traj(
			["scenario", "apply", "funded", "--file", "-", "--decimal"],
			JSON.stringify(fundedDocument(idOf("Bank"), idOf("Vault"))),
		)
	}, SLOW_MS)

	afterAll(async () => {
		if (scratch !== "") await removeScratch(scratch)
	})

	test(
		"starts the funded plan's success note with the hero's prefix, and is not a warning",
		() => {
			const body = traj([
				"projection",
				"chance",
				"--scenario",
				"funded",
				"--as-of",
				"2026-01-01",
				"--horizon",
				"2027-12-31",
				"--return-model",
				"plan",
				"--paths",
				"20",
				"--seed",
				"0123456789abcdef",
			]) as { notes: string[] }
			expect(body.notes.some((note) => note.includes("could not be funded"))).toBe(false)
			const success = body.notes.find((note) => note.startsWith(SUCCESS_NOTE_PREFIX))
			expect(success).toBeDefined()
			expect(isWarningNote(success ?? "")).toBe(false)
		},
		SLOW_MS,
	)
})
