// Deleting a loan the Baseline owes, and "I already owe it", against the real traj: the plan keeps projecting
// after the delete, and an owed loan opens its statement at the Baseline's balance (cli ADR 0059).
import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test"
import { scenarioDocument, snapshot } from "../src/lib/contract"
import { balanceOf } from "../src/lib/view/plan-items/accounts"
import { withFlow } from "../src/lib/view/plan-items/document"
import {
	loanDocument,
	loanOf,
	loanPartsOf,
	withoutLoan,
} from "../src/lib/view/plan-items/loan-document"
import { loanFromDraft } from "../src/lib/view/plan-items/loan-draft"
import { owedChoicesOf } from "../src/lib/view/plan-items/loan-owed"
import { statementOf } from "../src/lib/view/plan-items/loan-statement"
import { BOAT } from "./loans-boat.test-support"
import {
	applyInTerminal,
	baselineOf,
	disposeLedger,
	documentOf,
	runOf,
	SLOW_MS,
	save,
	setupLedger,
} from "./loans-ledger.test-support"
import { settle } from "./loans-running.test-support"

const DEL = "loan-del"
/** The id of the debt the Baseline holds, which the first test finds before it takes the loan's Flows out. */
let debt = ""

beforeAll(() => setupLedger([DEL]), SLOW_MS)
afterEach(settle, SLOW_MS)
afterAll(disposeLedger)

describe("deleting a loan the Baseline already owes", () => {
	test(
		"removes its Flows and keeps the debt declared, so the plan still projects",
		async () => {
			const doc = documentOf(DEL)
			const [loan] = loanPartsOf(doc)
			if (loan === undefined) throw new Error("the demo plan has no loan")
			debt = loan.account.id
			expect(balanceOf(loan.account, baselineOf())).toBe("184000.00")
			// A Flow that reads the debt through an `account` Measure also keeps working: the debt stays declared.
			const reader = {
				id: "reader",
				kind: "expense",
				frequency: "monthly",
				start: "2026-11-01",
				derive: {
					measures: [
						{ id: "worth", op: "account", account: loan.account.id },
						{ id: "tenth", op: "scale", of: "worth", num: 1, den: 100000, rounding: "floor" },
					],
					result: "tenth",
				},
			}
			const before = withFlow(doc, scenarioDocument.shape.flows.element.parse(reader))
			const removal = withoutLoan(before, loan.account.id, true)
			if (!removal.ok) throw new Error(removal.message)
			const answer = await save(DEL, removal.document)
			if (!answer.ok) throw new Error(answer.error?.message)
			expect(runOf(answer, DEL)).toBeDefined()
			const after = documentOf(DEL)
			expect(after.accounts.map((account) => account.id)).toContain(loan.account.id)
			expect(after.flows.map((flow) => flow.id)).not.toContain(loan.payment.id)
			expect(after.flows.map((flow) => flow.id)).toContain("reader")
		},
		SLOW_MS,
	)

	test(
		"removing the debt's Account as well is what made every read fail, and the page no longer does it",
		async () => {
			const doc = documentOf(DEL)
			const broken = {
				...doc,
				// Only the debt the Baseline holds: the demo's condo and its loan stay declared.
				accounts: doc.accounts.filter((a) => a.id !== debt),
				flows: doc.flows.filter((flow) => flow.id !== "reader"),
			}
			// The Edit itself is accepted; every read of the plan after it is what fails.
			const answer = await save(DEL, broken)
			expect(answer.ok).toBe(true)
			const read = snapshot.parse(answer.snapshot).reads.projections[DEL]
			expect(read?.ok).toBe(false)
			if (read !== undefined && !read.ok) {
				expect(read.error.code).toBe("projection_refused")
				expect(read.error.path).toContain("baseline.balances")
			}
			applyInTerminal(DEL, doc)
		},
		SLOW_MS,
	)
})

describe("I already owe it", () => {
	test(
		"attaches the loan to the debt the Baseline holds, and its statement opens at that balance",
		async () => {
			const doc = documentOf(DEL)
			const choices = owedChoicesOf(doc, baselineOf())
			expect(choices.map((choice) => choice.balance)).toEqual(["184000.00"])
			const [choice] = choices
			if (choice === undefined) throw new Error("no debt is offered")
			const result = loanFromDraft(
				{
					...BOAT,
					name: "",
					principal: "184000.00",
					rate: "5",
					payments: "23",
					firstPayment: "2026-11-01",
					arrival: "owed",
					arrivalDate: "",
					owedAccount: choice.id,
				},
				{ doc, choices },
			)
			if (!result.ok) throw new Error(JSON.stringify(result.problems))
			expect(result.loan.account.id).toBe(choice.id)
			const next = loanDocument(doc, result.loan, undefined)
			expect(next.accounts.length).toBe(doc.accounts.length)
			const answer = await save(DEL, next)
			if (!answer.ok) throw new Error(answer.error?.message)
			const statement = statementOf(runOf(answer, DEL), choice.id, {
				firstPayment: "2026-11-01",
				extras: [],
			})
			expect(statement.years[0]?.rows[0]?.opening).toBe("184000.00")
			expect(statement.paidOff).not.toBeNull()
			expect(loanOf(documentOf(DEL), choice.id)).toBeDefined()
		},
		SLOW_MS,
	)
})
