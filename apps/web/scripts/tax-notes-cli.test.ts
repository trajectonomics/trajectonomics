// The tax profile page's notes against the real traj (web ADR 0001): one scratch ledger and a plan for
// each kind of note, read through the same contract and mapping the Snapshot uses, so rewording a CLI
// sentence fails here instead of quietly leaving the page without a note.
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { mkdir } from "node:fs/promises"
import { join } from "node:path"
import { scenarioShow } from "../src/lib/contract"
import { decodeRead } from "../src/lib/snapshot/decode-read"
import { hasTaxProfile } from "../src/lib/snapshot/stage-two-tax-notes"
import { SEPARATE_LOANS_SENTENCE } from "../src/lib/view/tax-settings/notes"
import { makeScratch, removeScratch } from "./scratch"
import { linesOf, spawn, store, traj } from "./tax-notes-cli.test-support"

const SLOW_MS = 180_000

let scratch = ""
let home = ""
let bank = ""
let loan = ""

/** The household the plans share: each salary is its Owner's, and the loan is both people's. */
function household(partner = "partner"): unknown {
	return {
		schemaVersion: 2,
		people: [
			{ id: "me", role: "holder", born: "1990-01", lifeExpectancy: 90 },
			{ id: partner, role: "partner", born: "1992-01", lifeExpectancy: 90 },
		],
		anchors: [],
		owners: [
			{ path: "flows.salary", person: "me" },
			{ path: "flows.partner-salary", person: partner },
			{ path: `accounts.${loan}`, person: "shared" },
		],
	}
}

function coupleDocument(): unknown {
	return {
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: 0 },
		accounts: [
			{ id: bank, kind: "asset", rate: 0 },
			{ id: loan, kind: "liability", rate: 0 },
		],
		flows: [
			{
				id: "salary",
				kind: "income",
				earned: true,
				amount: "100000.00",
				frequency: "monthly",
				start: "2026-01-01",
				growth: { bps: 0 },
			},
			{
				id: "partner-salary",
				kind: "income",
				earned: true,
				amount: "60000.00",
				frequency: "monthly",
				start: "2026-01-01",
				growth: { bps: 0 },
			},
		],
		cashflow: { surplus: [{ account: bank }], contribute: [], withdraw: [bank] },
	}
}

/** `traj scenario tax <name> --tax th-2026 --filing-status married_separate` with both salaries labelled. */
function taxSeparately(name: string, extra: readonly string[] = []): void {
	traj(home, [
		"scenario",
		"tax",
		name,
		"--tax",
		"th-2026",
		"--filing-status",
		"married_separate",
		...extra,
		"--label",
		"salary=income.section40_1",
		"--label",
		"partner-salary=income.section40_1",
	])
}

/** Stores a plan, sets its household, and taxes it separately. */
function plan(name: string, extra: readonly string[] = []): void {
	store(home, name, coupleDocument())
	traj(home, ["scenario", "household", name, "--file", "-"], JSON.stringify(household()))
	taxSeparately(name, extra)
}

beforeAll(async () => {
	scratch = await makeScratch("traj-web-tax-notes-")
	home = join(scratch, "home")
	await mkdir(home, { recursive: true })
	traj(home, ["init"])
	for (const [name, type] of [
		["Bank", "asset"],
		["Loan", "liability"],
		["Opening", "equity"],
	] as const) {
		traj(home, ["account", "add", name, "--type", type, "--currency", "THB"])
	}
	traj(home, [
		"tx",
		"add",
		"--opening",
		"--from",
		"Opening",
		"--to",
		"Bank",
		"--amount",
		"100000.00",
		"--date",
		"2026-01-01",
	])
	const accounts = (traj(home, ["account", "list"]) as { accounts: { id: string; name: string }[] })
		.accounts
	const idOf = (name: string): string => {
		const found = accounts.find((account) => account.name === name)
		if (found === undefined) throw new Error(`the scratch ledger has no account ${name}`)
		return found.id
	}
	bank = idOf("Bank")
	loan = idOf("Loan")

	// Two Returns each claim home-loan interest while both own one loan: the CLI assumes separate loans.
	plan("split", ["--mortgage-interest", "me=50000", "--mortgage-interest", "partner=50000"])
	// A joint Return that keeps the partner's claims.
	plan("joint", ["--life-insurance", "partner=50000"])
	traj(home, ["scenario", "tax", "joint", "--merge", "--filing-status", "married_joint"])
	// A joint Return that keeps the shared loan's interest, which no Return of this write claims.
	plan("shared", ["--mortgage-interest", "shared=60000"])
	traj(home, ["scenario", "tax", "shared", "--merge", "--filing-status", "married_joint"])
	// The partner's claims stay stored under an id the household no longer names.
	plan("gone", ["--life-insurance", "partner=50000"])
	traj(home, ["scenario", "household", "gone", "--file", "-"], JSON.stringify(household("bob")))
	// No tax profile at all: the Snapshot must not ask for notes.
	store(home, "bare", coupleDocument())
}, SLOW_MS)

afterAll(async () => {
	if (scratch !== "") await removeScratch(scratch)
})

describe("the tax notes the real traj states", () => {
	test("the separate-loans assumption, in the CLI's sentence and not tax-core's bare one", () => {
		const before = traj(home, ["scenario", "show", "split"]) as {
			scenario: { version: number; contentHash: string }
		}
		const lines = linesOf(home, "split")
		const after = traj(home, ["scenario", "show", "split"]) as {
			scenario: { version: number; contentHash: string }
		}
		expect(lines).toHaveLength(1)
		expect(lines[0]).toContain(SEPARATE_LOANS_SENTENCE)
		expect(lines[0]).not.toContain("Home-loan interest ceiling, baht.")
		// A dry run writes nothing: the plan keeps its version and content hash.
		expect(after.scenario).toMatchObject(before.scenario)
	})

	test("the shared interest a joint Return does not claim", () => {
		expect(linesOf(home, "shared")).toContainEqual(
			expect.stringMatching(
				/60,000 baht of shared home-loan interest is stored for separate Returns/,
			),
		)
	})

	test("the other person's claims a joint Return keeps", () => {
		expect(linesOf(home, "joint")).toContainEqual(
			expect.stringMatching(
				/The claims stored for "partner" are kept for a separate filing, and this Return does not claim them\./,
			),
		)
	})

	test("the claims stored under an id no longer in the household", () => {
		expect(linesOf(home, "gone")).toContainEqual(
			expect.stringMatching(
				/The claims stored for "partner", who is not in the household, are on no Return\./,
			),
		)
	})

	test("a plan with no tax profile is not asked", () => {
		const argv = ["scenario", "show", "--decimal", "--json", "bare"]
		const captured = spawn(home, argv)
		const shown = decodeRead(
			argv,
			{
				code: captured.exitCode,
				stdout: captured.stdout.toString(),
				stderr: captured.stderr.toString(),
			},
			scenarioShow,
		)
		expect(shown.ok).toBe(true)
		if (shown.ok) expect(hasTaxProfile(shown)).toBe(false)
	})
})
