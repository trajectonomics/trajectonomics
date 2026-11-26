// The tax profile page's notes against the real traj (web ADR 0001): one scratch ledger and a plan for
// each kind of note, read through the same contract and mapping the Snapshot uses, so rewording a CLI
// sentence fails here instead of quietly leaving the page without a note.
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { mkdir } from "node:fs/promises"
import { join } from "node:path"
import { scenarioShow } from "../src/lib/contract"
import { decodeRead } from "../src/lib/snapshot/decode-read"
import { hasTaxProfile } from "../src/lib/snapshot/stage-two-tax-notes"
import {
	DEPARTED_CLAIMS_MARKER,
	DEPARTED_CLAIMS_OPENING,
	SEPARATE_LOANS_SENTENCE,
} from "../src/lib/view/tax-settings/notes"
import { makeScratch, removeScratch } from "./scratch"
import {
	coupleDocument,
	household,
	linesOf,
	readNotes,
	spawn,
	store,
	taxSeparately,
	traj,
} from "./tax-notes-cli.test-support"

const SLOW_MS = 180_000

let scratch = ""
let home = ""
let bank = ""
let loan = ""

/** Stores a plan, sets its household, and taxes it separately. */
function plan(name: string, extra: readonly string[] = []): void {
	store(home, name, coupleDocument(bank, loan))
	traj(home, ["scenario", "household", name, "--file", "-"], JSON.stringify(household(loan)))
	taxSeparately(home, name, extra)
}

/** Applies the plan's stored document again without one Flow, keeping its stored tax profile. */
function withoutFlow(name: string, flowId: string): void {
	const shown = traj(home, ["scenario", "show", name, "--decimal"]) as {
		scenario: { document: { flows: { id: string }[] } }
	}
	const document = shown.scenario.document
	store(home, name, { ...document, flows: document.flows.filter((flow) => flow.id !== flowId) })
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
	traj(
		home,
		["scenario", "household", "gone", "--file", "-"],
		JSON.stringify(household(loan, "bob")),
	)
	// A separate Return writes no Return for the partner once their salary is gone: their parents' claims are on no Return.
	plan("no-return", ["--parents", "partner=2"])
	withoutFlow("no-return", "partner-salary")
	// No tax profile at all: the Snapshot must not ask for notes.
	store(home, "bare", coupleDocument(bank, loan))
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
		// The CLI quotes the raw id; the page says it in the household's words instead.
		const raw = readNotes(home, "gone")
		if (!raw.ok) throw new Error(raw.error.message)
		expect(raw.data.unclaimed).toContainEqual(
			expect.stringContaining(`${DEPARTED_CLAIMS_OPENING}partner${DEPARTED_CLAIMS_MARKER}`),
		)
		expect(linesOf(home, "gone")).toContainEqual(
			expect.stringMatching(
				/The claims stored for the earlier holder, who is not in the household, are on no Return\./,
			),
		)
		expect(linesOf(home, "gone").join("\n")).not.toContain('"partner"')
	})

	test("a separate filing's claim under a person with no taxed income", () => {
		expect(linesOf(home, "no-return")).toContainEqual(
			expect.stringMatching(
				/"partner" has no taxed income in this plan, so no Return claims their stored claims\./,
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
