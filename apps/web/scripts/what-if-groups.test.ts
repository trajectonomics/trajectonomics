// A loan's or an asset's What-if changes stay together, against the real traj: a loan Try then removed leaves the
// plan as it was, and an asset switched off and Applied leaves no loan owing and no draw without a purchase (cli ADR
// 0059, 0060, 0062). Each test makes its own plan, so each passes alone.
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { whatIfSession } from "../src/client/what-if.svelte"
import { tryLoanInWhatIf } from "../src/components/plan-items/loan-what-if"
import { assetCardsOf } from "../src/lib/view/plan-items/asset-card"
import { assetDocument } from "../src/lib/view/plan-items/asset-document"
import { homeDraft, partsOf } from "../src/lib/view/plan-items/asset-fixtures.test-support"
import { loanDocument, loanOf } from "../src/lib/view/plan-items/loan-document"
import { loanFromDraft } from "../src/lib/view/plan-items/loan-draft"
import { BOAT } from "./loans-boat.test-support"
import {
	type Answer,
	baselineOf,
	disposeLedger,
	documentOf,
	hashOf,
	runOf,
	SLOW_MS,
	save,
	send,
	setupLedger,
} from "./loans-ledger.test-support"

/** The real fetch: `bun test` runs every file in one process, so a later file must get it back. */
const realFetch = globalThis.fetch
const LOAN = "group-loan"
const BACK = "group-loan-back"
const SOLD = "group-sold"
const HALF = "group-half"

beforeAll(() => setupLedger([LOAN, BACK, SOLD, HALF]), SLOW_MS)
afterAll(async () => {
	whatIfSession.end()
	globalThis.fetch = realFetch
	await disposeLedger()
})

/** Starts a session on a plan with no server to read it. */
function newSession(): void {
	whatIfSession.end()
	globalThis.fetch = (() => new Promise<Response>(() => {})) as unknown as typeof fetch
}

/** The plan with the boat loan saved to it. */
async function withBoatLoan(plan: string): Promise<void> {
	const doc = documentOf(plan)
	const result = loanFromDraft(BOAT, { doc })
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	const answer = await save(plan, loanDocument(doc, result.loan, undefined))
	if (!answer.ok) throw new Error(answer.error?.message)
}

/** The content hash of the plan the session's changes make: a fork carrying them, so a change that is still there shows. */
async function effectiveHash(plan: string, copy: string): Promise<string> {
	const changes = whatIfSession.changesFor(plan) ?? { sets: [], removals: [] }
	const answer = await send({ kind: "copy-plan", from: plan, name: copy, ...changes })
	if (!answer.ok) throw new Error(answer.error?.message)
	return hashOf(copy)
}

/** Whether the run states a loan as owing at its last month. */
function owingAtEnd(answer: Answer, plan: string, account: string): boolean {
	const rows = runOf(answer, plan).tables.flatMap((table) =>
		table.name === "liabilities" ? table.rows.filter((row) => row.account === account) : [],
	)
	const closing = rows[rows.length - 1]?.closing
	return closing !== undefined && !/^-?0(\.0+)?$/.test(closing)
}

describe("a loan Try, then removed", () => {
	test(
		"leaves the plan exactly as no session would: the same effective hash",
		async () => {
			await withBoatLoan(LOAN)
			newSession()
			const hash = hashOf(LOAN)
			const doc = documentOf(LOAN)
			const stored = loanOf(doc, "boat-loan")
			if (stored === undefined) throw new Error("no boat loan")
			// A Set of the salary to what it already is keeps the session open without changing the plan, so the
			// effective plan is read from a fork that carries what the session holds.
			const salary = doc.flows.find((flow) => flow.id === "salary")?.amount ?? ""
			whatIfSession.tryItem(LOAN, hash, "flows", "salary", { amount: "0.00" }, { amount: salary })
			expect(whatIfSession.whatIf?.sets).toHaveLength(1)
			const none = await effectiveHash(LOAN, "group-loan-none")
			expect(none).toBe(hash)
			const edited = loanFromDraft(
				{ ...BOAT, principal: "400000.00", rate: "7.00" },
				{ doc, existing: stored },
			)
			if (!edited.ok) throw new Error(JSON.stringify(edited.problems))
			expect(tryLoanInWhatIf(LOAN, hash, stored, edited.loan)).toEqual([])
			expect(whatIfSession.changes.map((change) => change.label)).toEqual([
				"Salary amount set to 90000.00",
				"Loan boat-loan tried as edited",
			])
			expect(await effectiveHash(LOAN, "group-loan-tried")).not.toBe(hash)
			const change = whatIfSession.changes.find((one) => one.kind === "group")
			if (change === undefined) throw new Error("no change")
			whatIfSession.removeChange(change)
			expect(whatIfSession.whatIf?.groups).toEqual([])
			expect(await effectiveHash(LOAN, "group-loan-removed")).toBe(none)
			expect(documentOf(LOAN)).toEqual(doc)
		},
		SLOW_MS,
	)
})

/** The plan with the home saved to it: bought with a loan, sold in 2030 with the loan repaid from the sale. */
async function withHome(plan: string): Promise<void> {
	const doc = documentOf(plan)
	const answer = await save(plan, assetDocument(doc, partsOf(homeDraft(), doc), undefined))
	if (!answer.ok) throw new Error(answer.error?.message)
}

/** The ids of the plan's items that name the home: its Flows and its Accounts. */
function homeItems(plan: string): string[] {
	const doc = documentOf(plan)
	return [...doc.flows, ...doc.accounts]
		.map((item) => item.id)
		.filter((id) => id.startsWith("home"))
}

describe("an asset switched off", () => {
	test(
		"and Applied leaves no loan owing and no draw without its purchase",
		async () => {
			await withHome(SOLD)
			expect(homeItems(SOLD).length).toBeGreaterThan(5)
			newSession()
			const card = assetCardsOf(documentOf(SOLD), baselineOf(), undefined).find(
				(one) => one.id === "home",
			)
			if (card === undefined) throw new Error("no home card")
			const { spec, removals } = card.switch
			expect(whatIfSession.setGroupOff(SOLD, hashOf(SOLD), spec, removals, true)).toBe(true)
			expect(whatIfSession.changes.map((change) => change.label)).toEqual([
				"Asset home switched off",
			])
			const changes = whatIfSession.changesFor(SOLD)
			const answer = await send({
				kind: "apply-overrides",
				name: SOLD,
				contentHash: hashOf(SOLD),
				...changes,
			})
			if (!answer.ok) throw new Error(answer.error?.message)
			expect(homeItems(SOLD)).toEqual([])
			expect(owingAtEnd(answer, SOLD, "home-loan")).toBe(false)
		},
		SLOW_MS,
	)

	test(
		"in one part only is what the switch prevents: the payoff alone leaves the loan owing for good",
		async () => {
			await withHome(HALF)
			const card = assetCardsOf(documentOf(HALF), baselineOf(), undefined).find(
				(one) => one.id === "home",
			)
			expect(card?.switch.removals).toContain("flows.home-loan-payoff")
			const answer = await send({
				kind: "apply-overrides",
				name: HALF,
				contentHash: hashOf(HALF),
				sets: [],
				removals: ["flows.home-loan-payoff"],
			})
			if (!answer.ok) throw new Error(answer.error?.message)
			expect(owingAtEnd(answer, HALF, "home-loan")).toBe(true)
		},
		SLOW_MS,
	)
})
