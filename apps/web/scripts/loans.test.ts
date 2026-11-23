// A plan that holds a loan, against the real traj: the Snapshot reads its document (cli ADR-0016), an Edit to
// another item keeps the loan's fields as they were, and a loan refusal is worded at its field.
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { snapshot } from "../src/lib/contract"
import { demoCarryIn } from "./demo/carry-in"
import { buildDemoLedger } from "./demo-ledger"
import { BINARY, SLOW_MS, withAmount } from "./edit-fixture.test-support"
import { editRequest, PARAMS, TOKEN } from "./edit-request.test-support"
import { createEditor, type Editor } from "./serve-edit"

const PLAN = "loan-plan"
type Flow = { id: string; amount?: string; source?: string; [key: string]: unknown }
type Document = { flows: Flow[]; accounts: { id: string; kind: string }[] }
type ShownDocument = { scenario: { contentHash: string; document: Document } }

let scratch = ""
let home = ""
let editor: Editor | null = null
/** The loan plan's loan Flows as the ledger holds them before any Edit, in the decimal form. */
let loans: Flow[] = []

/** `traj scenario apply` on the scratch ledger, with a document on stdin, as a person at a terminal runs it. */
function applyInTerminal(name: string, document: unknown, extra: string[] = []): void {
	const run = Bun.spawnSync(
		[BINARY, "scenario", "apply", name, "--file", "-", "--decimal", "--json", ...extra],
		{
			env: { ...process.env, TRAJ_HOME: home },
			stdin: new TextEncoder().encode(JSON.stringify(document)),
		},
	)
	if (run.exitCode !== 0) throw new Error(run.stderr.toString() || run.stdout.toString())
}

/** `traj scenario show --decimal --json` on this test's ledger: the Scenario as the ledger holds it. */
function showOf(name: string): ShownDocument {
	const run = Bun.spawnSync([BINARY, "scenario", "show", "--decimal", "--json", "--", name], {
		env: { ...process.env, TRAJ_HOME: home },
	})
	if (run.exitCode !== 0) throw new Error(run.stderr.toString())
	return JSON.parse(run.stdout.toString()) as ShownDocument
}

/** The content hash of a plan as the ledger holds it: the one a page that read it sends with its Edit. */
function hashOf(name: string): string {
	return showOf(name).scenario.contentHash
}

/** The base plan's document with a withdrawal that borrows into its liability, and a level loan that repays it. */
function loanDocument(): Document {
	const base = showOf("base").scenario.document
	const liability = base.accounts.find((account) => account.kind === "liability")
	if (liability === undefined) throw new Error("the demo base has no liability")
	const draw = {
		id: "car-draw",
		kind: "withdrawal",
		frequency: "once",
		start: "2027-01-01",
		amount: "500000.00",
		growth: { bps: 0 },
		source: liability.id,
	}
	const repay = {
		id: "car-loan",
		kind: "contribution",
		frequency: "monthly",
		start: "2027-02-01",
		target: liability.id,
		level: { principal: "500000.00", payments: 60, rounding: "halfUp" },
	}
	return { ...base, flows: [...base.flows, draw, repay] }
}

/** The loan Flows of the plan as the decimal document holds them. */
function loansOf(name: string): Flow[] {
	const document = showOf(name).scenario.document
	return document.flows.filter((flow) => flow.id === "car-draw" || flow.id === "car-loan")
}

function serve(): Editor {
	if (editor === null) throw new Error("the editor is not set up")
	return editor
}

beforeAll(async () => {
	scratch = await mkdtemp(join(tmpdir(), "traj-web-loans-"))
	home = join(scratch, "traj-home")
	await buildDemoLedger({ binary: BINARY, home, scratch })
	applyInTerminal(PLAN, loanDocument())
	loans = loansOf(PLAN)
	editor = createEditor({
		traj: { binary: BINARY, env: { ...process.env, TRAJ_HOME: home } },
		cliVersion: "test",
		params: { ...PARAMS, scenarios: [PLAN], carryIn: true },
		records: demoCarryIn([PLAN]),
		token: TOKEN,
	})
	await serve().refresh()
}, SLOW_MS)

afterAll(async () => {
	if (scratch !== "") await rm(scratch, { recursive: true, force: true })
})

describe("a plan that holds a loan, against the real traj", () => {
	test(
		"the Snapshot reads its document, and the whole Snapshot parses with the contract",
		() => {
			const shown = JSON.parse(serve().body ?? "null") as {
				reads: { documents: Record<string, { ok: boolean; error?: { message: string } }> }
			}
			const read = shown.reads.documents[PLAN]
			expect(read?.ok).toBe(true)
			expect(snapshot.safeParse(shown).success).toBe(true)
			expect(loans.map((flow) => flow.id)).toEqual(["car-draw", "car-loan"])
		},
		SLOW_MS,
	)

	test(
		"saving another item of the plan keeps the loan's fields exactly as they were",
		async () => {
			const document = withAmount(showOf(PLAN).scenario.document, "salary", "91000.00")
			const body = JSON.stringify({
				kind: "apply-plan",
				name: PLAN,
				contentHash: hashOf(PLAN),
				document,
			})
			const response = await serve().edit(editRequest({}, body), 4321)
			const answer = (await response.json()) as { ok: boolean; error?: { message: string } }
			if (!answer.ok) throw new Error(answer.error?.message)
			expect(loansOf(PLAN)).toEqual(loans)
			const salary = showOf(PLAN).scenario.document.flows.find((flow) => flow.id === "salary")
			expect(salary?.amount).toBe("91000.00")
		},
		SLOW_MS,
	)

	test(
		"a sale that starts before its asset unlocks is refused in words, at its start, and changes nothing",
		async () => {
			const document = loanDocument()
			const asset = document.accounts.find((account) => account.kind === "asset")
			if (asset === undefined) throw new Error("the demo base has no asset")
			const draw = document.flows.find((flow) => flow.id === "car-draw")
			if (draw === undefined) throw new Error("the loan document has no withdrawal")
			Object.assign(asset, { lockedUntil: "2099-01-01" })
			draw.source = asset.id
			const index = document.flows.indexOf(draw)
			const body = JSON.stringify({
				kind: "apply-plan",
				name: PLAN,
				contentHash: hashOf(PLAN),
				document,
			})
			const response = await serve().edit(editRequest({}, body), 4321)
			const answer = (await response.json()) as {
				ok: boolean
				error?: { code: string; message: string; path?: string; hint?: string }
			}
			expect(answer.ok).toBe(false)
			expect(answer.error?.code).toBe("invalid_input")
			expect(answer.error?.path).toBe(`document.flows.${index}.start`)
			expect(answer.error?.message).toBe(
				"A withdrawal sells an asset that is locked on the withdrawal's first date, and no Milestone gate says to wait, so it could never move anything on that date.",
			)
			expect(loansOf(PLAN)).toEqual(loans)
		},
		SLOW_MS,
	)
})
