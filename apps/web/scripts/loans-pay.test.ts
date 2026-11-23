// A loan saved from the planner's forms, against the real traj: the loan is drawn on a future date and its
// paid-off date is read back from the Snapshot's statement; a payment extra moves that date; every other item
// of the plan is kept; and a refusal the CLI words at the payments names that field (cli ADR 0059).
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
	type ErrorBody,
	type ProjectionRun,
	type ScenarioDocument,
	scenarioDocument,
	snapshot,
} from "../src/lib/contract"
import { withFlow } from "../src/lib/view/plan-items/document"
import { extraDraftOf, extraFromDraft } from "../src/lib/view/plan-items/extra-payment"
import { loanDocument, loanOf } from "../src/lib/view/plan-items/loan-document"
import { type LoanDraft, loanFromDraft } from "../src/lib/view/plan-items/loan-draft"
import { loanFieldOfRefusal, loanLayoutOf } from "../src/lib/view/plan-items/loan-refusal"
import { statementOf } from "../src/lib/view/plan-items/loan-statement"
import { demoCarryIn } from "./demo/carry-in"
import { buildDemoLedger } from "./demo-ledger"
import { BINARY, SLOW_MS } from "./edit-fixture.test-support"
import { editRequest, PARAMS, TOKEN } from "./edit-request.test-support"
import { createEditor, type Editor } from "./serve-edit"

const PLAN = "loan-pay"
const LOAN = "boat-loan"

/** An Edit's answer: the new Snapshot, or the CLI's error envelope. */
type Answer = {
	ok: boolean
	snapshot?: unknown
	error?: { code: string; message: string; path?: string }
}

let scratch = ""
let home = ""
let editor: Editor | null = null
/** The plan as the ledger held it before any planner Edit: the baseline the last test compares against. */
let initial: ScenarioDocument | null = null

/** `traj scenario apply` on the scratch ledger, with a document on stdin, as a person at a terminal runs it. */
function applyInTerminal(name: string, document: unknown): void {
	const run = Bun.spawnSync(
		[BINARY, "scenario", "apply", name, "--file", "-", "--decimal", "--json"],
		{
			env: { ...process.env, TRAJ_HOME: home },
			stdin: new TextEncoder().encode(JSON.stringify(document)),
		},
	)
	if (run.exitCode !== 0) throw new Error(run.stderr.toString() || run.stdout.toString())
}

/** The plan's document as the ledger holds it, in the decimal form the planner pages edit. */
function documentOf(name: string): ScenarioDocument {
	const run = Bun.spawnSync([BINARY, "scenario", "show", "--decimal", "--json", "--", name], {
		env: { ...process.env, TRAJ_HOME: home },
	})
	if (run.exitCode !== 0) throw new Error(run.stderr.toString())
	return scenarioDocument.parse(
		(JSON.parse(run.stdout.toString()) as { scenario: { document: unknown } }).scenario.document,
	)
}

/** The content hash of the plan as the ledger holds it: the one a page that read it sends with its Edit. */
function hashOf(name: string): string {
	const run = Bun.spawnSync([BINARY, "scenario", "show", "--decimal", "--json", "--", name], {
		env: { ...process.env, TRAJ_HOME: home },
	})
	return (JSON.parse(run.stdout.toString()) as { scenario: { contentHash: string } }).scenario
		.contentHash
}

/** Sends one apply-plan Edit with the document, as the planner's form does, and returns the answer. */
async function saveDocument(document: ScenarioDocument): Promise<Answer> {
	const body = JSON.stringify({
		kind: "apply-plan",
		name: PLAN,
		contentHash: hashOf(PLAN),
		document,
	})
	const response = await editor_().edit(editRequest({}, body), 4321)
	return (await response.json()) as Answer
}

/** The plan's projection run from an Edit's answer: the Snapshot states it with `--liabilities`. */
function runOf(answer: Answer): ProjectionRun {
	if (!answer.ok || answer.snapshot === undefined)
		throw new Error(answer.error?.message ?? "no snapshot")
	const shown = snapshot.parse(answer.snapshot)
	const read = shown.reads.projections[PLAN]
	if (read === undefined || !read.ok)
		throw new Error(read?.ok === false ? read.error.message : "no run")
	return read.data
}

function editor_(): Editor {
	if (editor === null) throw new Error("the editor is not set up")
	return editor
}

/** The draft of the boat loan a person types: borrowed on a future date, 24 monthly payments. */
const LOAN_DRAFT: LoanDraft = {
	name: "Boat loan",
	principal: "300000.00",
	rate: "6.25",
	compounding: "monthly",
	payments: "24",
	firstPayment: "2027-07-01",
	rounding: "halfUp",
	arrival: "date",
	arrivalDate: "2027-06-01",
}

beforeAll(async () => {
	scratch = await mkdtemp(join(tmpdir(), "traj-web-loans-pay-"))
	home = join(scratch, "traj-home")
	await buildDemoLedger({ binary: BINARY, home, scratch })
	// The plan starts as the demo's base, with no loan of the planner's own.
	applyInTerminal(PLAN, documentOf("base"))
	initial = documentOf(PLAN)
	editor = createEditor({
		traj: { binary: BINARY, env: { ...process.env, TRAJ_HOME: home } },
		cliVersion: "test",
		params: { ...PARAMS, scenarios: [PLAN], carryIn: true },
		records: demoCarryIn([PLAN]),
		token: TOKEN,
	})
	await editor_().refresh()
}, SLOW_MS)

afterAll(async () => {
	if (scratch !== "") await rm(scratch, { recursive: true, force: true })
})

describe("a loan saved from the planner, against the real traj", () => {
	let saved: ProjectionRun | null = null

	test(
		"a loan drawn on a future date is saved as its three parts, and its paid-off date is read back",
		async () => {
			const result = loanFromDraft(LOAN_DRAFT, { doc: documentOf(PLAN) })
			if (!result.ok) throw new Error(JSON.stringify(result.problems))
			const answer = await saveDocument(loanDocument(documentOf(PLAN), result.loan, undefined))
			if (!answer.ok) throw new Error(answer.error?.message)
			const run = runOf(answer)
			saved = run
			const after = documentOf(PLAN)
			expect(loanOf(after, LOAN)).toBeDefined()
			expect(after.flows.find((flow) => flow.id === `${LOAN}-draw`)?.start).toBe("2027-06-01")
			expect(statementOf(run, LOAN).paidOff).not.toBeNull()
			expect(statementOf(run, LOAN).payment).not.toBeNull()
		},
		SLOW_MS,
	)

	test(
		"paying extra moves the paid-off date earlier",
		async () => {
			if (saved === null) throw new Error("the loan was not saved")
			const paidOff = statementOf(saved, LOAN).paidOff
			if (paidOff === null) throw new Error("the loan has no paid-off date to move")
			const current = documentOf(PLAN)
			const extra = extraFromDraft(
				{ ...extraDraftOf(), amount: "100000.00", start: "2028-01-01" },
				{ loanId: LOAN, doc: current },
			)
			if (!extra.ok) throw new Error(JSON.stringify(extra.problems))
			const answer = await saveDocument(withFlow(current, extra.flow))
			if (!answer.ok) throw new Error(answer.error?.message)
			const moved = statementOf(runOf(answer), LOAN).paidOff
			expect(moved).not.toBeNull()
			expect(moved !== null && moved < paidOff).toBe(true)
		},
		SLOW_MS,
	)

	test(
		"saving the loan keeps every other field of the plan as it was",
		() => {
			if (initial === null) throw new Error("the plan was not read")
			const ours = (id: string) => id === LOAN || id.startsWith(`${LOAN}-`)
			const kept = (doc: ScenarioDocument) => ({
				...doc,
				accounts: doc.accounts.filter((account) => !ours(account.id)),
				flows: doc.flows.filter((flow) => !ours(flow.id)),
			})
			expect(kept(documentOf(PLAN))).toEqual(kept(initial))
		},
		SLOW_MS,
	)

	test(
		"a payment count traj refuses is named at the payments field, and nothing changes",
		async () => {
			const before = documentOf(PLAN)
			const result = loanFromDraft({ ...LOAN_DRAFT, name: "Van loan" }, { doc: before })
			if (!result.ok) throw new Error(JSON.stringify(result.problems))
			const next = loanDocument(before, result.loan, undefined)
			const loan = loanOf(next, "van-loan")
			if (loan === undefined) throw new Error("the loan is not in the document")
			const index = next.flows.findIndex((flow) => flow.id === loan.payment.id)
			const level = loan.payment.level
			if (level === undefined) throw new Error("the loan has no level payment")
			next.flows[index] = { ...loan.payment, level: { ...level, payments: 0 } }
			const answer = await saveDocument(next)
			expect(answer.ok).toBe(false)
			expect(answer.error?.path).toBe(`document.flows.${index}.level.payments`)
			const layout = loanLayoutOf(next, loan)
			expect(loanFieldOfRefusal(answer.error as unknown as ErrorBody, layout)).toBe("payments")
			expect(documentOf(PLAN).accounts.map((account) => account.id)).not.toContain("van-loan")
		},
		SLOW_MS,
	)
})
