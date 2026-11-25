// A What-if Try of a loan's principal, and a stale loan save, against the real traj: Apply and Save as new plan
// store a plan whose draw and payment agree, and a save over a changed plan is refused (cli ADR 0055, 0056).
import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test"
import { whatIfSession } from "../src/client/what-if.svelte"
import { tryLoanInWhatIf } from "../src/components/plan-items/loan-what-if"
import { loanDocument, loanOf } from "../src/lib/view/plan-items/loan-document"
import { loanFromDraft } from "../src/lib/view/plan-items/loan-draft"
import { statementOf } from "../src/lib/view/plan-items/loan-statement"
import { settle } from "./editor-running.test-support"
import { BOAT } from "./loans-boat.test-support"
import {
	applyInTerminal,
	disposeLedger,
	documentOf,
	hashOf,
	runOf,
	SLOW_MS,
	save,
	send,
	setupLedger,
	showOf,
} from "./loans-ledger.test-support"

/** The real fetch: `bun test` runs every file in one process, so a later file must get it back. */
const realFetch = globalThis.fetch
const TRY = "loan-try"
const STALE = "loan-stale"

beforeAll(() => setupLedger([TRY, STALE]), SLOW_MS)
afterEach(settle, SLOW_MS)
afterAll(async () => {
	whatIfSession.end()
	globalThis.fetch = realFetch
	await disposeLedger()
})

describe("a What-if Try of a loan's principal", () => {
	/** The boat loan, saved to the plan: 300000.00 drawn on 2027-06-01, repaid in 24 payments. */
	async function withBoatLoan(): Promise<void> {
		const doc = documentOf(TRY)
		const result = loanFromDraft(BOAT, { doc })
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		const answer = await save(TRY, loanDocument(doc, result.loan, undefined))
		if (!answer.ok) throw new Error(answer.error?.message)
	}

	/** Tries 400000.00 in the session and returns its Sets, without a server to read them. */
	function tryFourHundred(): { path: string; value: unknown }[] {
		const doc = documentOf(TRY)
		const stored = loanOf(doc, "boat-loan")
		if (stored === undefined) throw new Error("the boat loan is not in the plan")
		const edited = loanFromDraft({ ...BOAT, principal: "400000.00" }, { doc, existing: stored })
		if (!edited.ok) throw new Error(JSON.stringify(edited.problems))
		whatIfSession.end()
		globalThis.fetch = (() => new Promise<Response>(() => {})) as unknown as typeof fetch
		expect(tryLoanInWhatIf(TRY, hashOf(TRY), stored, edited.loan)).toEqual([])
		return [...(whatIfSession.whatIf?.sets ?? [])]
	}

	/** The stored plan's loan: its draw and its payment's principal, which must be the same amount. */
	function stored(name: string): { draw: string | undefined; principal: string | undefined } {
		const loan = loanOf(documentOf(name), "boat-loan")
		return { draw: loan?.draw?.amount, principal: loan?.payment.level?.principal }
	}

	test(
		"Apply stores a plan whose draw and payment borrow the same amount",
		async () => {
			await withBoatLoan()
			const sets = tryFourHundred()
			expect(sets.map((set) => set.path)).toContain("flows.boat-loan-draw.amount")
			const answer = await send({
				kind: "apply-overrides",
				name: TRY,
				contentHash: hashOf(TRY),
				sets,
				removals: [],
			})
			if (!answer.ok) throw new Error(answer.error?.message)
			expect(stored(TRY)).toEqual({ draw: "400000.00", principal: "400000.00" })
			const rows = statementOf(runOf(answer, TRY), "boat-loan", {
				firstPayment: "2027-07-01",
				extras: [],
			}).years.flatMap((year) => year.rows)
			expect(rows.some((row) => row.drawn === "400000.00")).toBe(true)
		},
		SLOW_MS,
	)

	test(
		"Save as new plan stores the same consistent plan, and the original keeps its loan",
		async () => {
			whatIfSession.end()
			// The plan was applied above; set it back to 300000.00 so the copy has something to move.
			const doc = documentOf(TRY)
			const result = loanFromDraft(BOAT, { doc, existing: loanOf(doc, "boat-loan") })
			if (!result.ok) throw new Error(JSON.stringify(result.problems))
			const answer = await save(TRY, loanDocument(doc, result.loan, loanOf(doc, "boat-loan")))
			if (!answer.ok) throw new Error(answer.error?.message)
			expect(stored(TRY)).toEqual({ draw: "300000.00", principal: "300000.00" })
			const sets = tryFourHundred()
			const copy = await send({
				kind: "copy-plan",
				from: TRY,
				name: "loan-try-copy",
				sets,
				removals: [],
			})
			if (!copy.ok) throw new Error(copy.error?.message)
			expect(stored("loan-try-copy")).toEqual({ draw: "400000.00", principal: "400000.00" })
			expect(stored(TRY)).toEqual({ draw: "300000.00", principal: "300000.00" })
		},
		SLOW_MS,
	)
})

describe("a loan save over a plan that changed since the page read it", () => {
	test(
		"is refused as changed, so the form shows Reload, and the plan keeps the other change",
		async () => {
			const read = hashOf(STALE)
			const doc = documentOf(STALE)
			const changed = doc.flows.map((flow) =>
				flow.id === "salary" ? { ...flow, amount: "9999.00" } : flow,
			)
			applyInTerminal(STALE, { ...doc, flows: changed })
			const stored = showOf(STALE)
			const result = loanFromDraft(BOAT, { doc })
			if (!result.ok) throw new Error(JSON.stringify(result.problems))
			const answer = await save(STALE, loanDocument(doc, result.loan, undefined), read)
			expect(answer.ok).toBe(false)
			expect(answer.error?.code).toBe("scenario_changed")
			expect(showOf(STALE)).toEqual(stored)
		},
		SLOW_MS,
	)
})
