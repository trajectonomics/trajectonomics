import { describe, expect, it } from "bun:test"
import type { ProjectionRow, Scenario } from "@trajectonomics/core/sim"
import type { CompareView } from "./projection/compare-view"
import type { FiView } from "./projection/fi-view"
import { baseFlags, dateFlags, fi, projection, projectionHome } from "./projection/testing"
import { withdrawNotes } from "./projection/withdraw-notes"
import { runBody } from "./projection-run-support"

/** The shape of the issue: tax owed at a Settlement and cash that no `withdraw` list names. */
const DOCUMENT = {
	schemaVersion: 4,
	currency: "THB",
	economy: { inflation: 0 },
	accounts: [
		{ id: "cash", kind: "asset", rate: 0 },
		{ id: "vault", kind: "asset", rate: 0, lockedUntil: "2030-01-01" },
		{ id: "loan", kind: "liability", rate: 0 },
	],
	flows: [],
	cashflow: { surplus: [{ account: "cash" }], contribute: [], withdraw: [] },
} satisfies Scenario
const CASH = { id: "cash", kind: "asset", rate: 0 } as const
const HOME = { id: "home", kind: "asset", rate: 0, liquid: false } as const
const HUGE_RENT = ["--set", "flows.rent.amount=900000000"]
const RAN_OUT = { date: "2027-03-31", unmet: 12_500_000 }

/** The row a Projection keeps on a date, holding each Account's balance in minor units. */
function rowOn(date: string, held: Record<string, number>): ProjectionRow {
	const balances = Object.entries(held).map(([account, amount]) => ({
		account,
		amount,
		capitalised: amount,
		accruedInterest: 0,
	}))
	return {
		date,
		balances,
		netWorth: 0,
		accessibleNetWorth: 0,
		realBalances: balances,
		realNetWorth: 0,
		realAccessibleNetWorth: 0,
	}
}
const HELD = [rowOn("2027-03-31", { cash: 50_000_000, vault: 7_000_000, loan: -1_000_000 })]
const RUN = { runsOut: RAN_OUT, rows: HELD }

describe("the withdraw sentence", () => {
	it("names the unlisted asset Account, what it held, the amount, and the exact change to make", () => {
		const [note] = withdrawNotes(DOCUMENT, RUN, "THB")
		expect(note).toContain("125000.00 unmet on 2027-03-31")
		expect(note).toContain("not in it, holding on that day: cash (500000.00).")
		expect(note).toContain(`--set 'cashflow.withdraw=["cash"]'`)
	})

	it("skips an unlisted asset Account that held nothing on the day, since adding it would change nothing", () => {
		const drained = { runsOut: RAN_OUT, rows: [rowOn("2027-03-31", { cash: 0 })] }
		expect(withdrawNotes(DOCUMENT, drained, "THB")).toEqual([])
		expect(withdrawNotes(DOCUMENT, { runsOut: RAN_OUT, rows: [] }, "THB")).toEqual([])
	})

	it("skips a locked Account, a liability, and an Account already listed", () => {
		const listed = { ...DOCUMENT, cashflow: { ...DOCUMENT.cashflow, withdraw: ["cash"] } }
		expect(withdrawNotes(listed, RUN, "THB")).toEqual([])
	})

	it("never suggests a marked home, which check() refuses in cashflow.withdraw", () => {
		// Cash is listed and runs out with 12,500.00 unmet. The home holds 6,000.00 (600,000 satang).
		// Unmarked, the sentence would suggest the home; marked, it is left out and no note is made.
		const plan = { ...DOCUMENT, accounts: [CASH, HOME] }
		const listed = { ...plan, cashflow: { ...plan.cashflow, withdraw: ["cash"] } }
		const rows = [rowOn("2027-03-31", { cash: 0, home: 600_000 })]
		const marked = withdrawNotes(listed, { runsOut: RAN_OUT, rows }, "THB")
		expect(marked).toEqual([])
		expect(marked.join(" ")).not.toContain("home")
		const bare = { id: "home", kind: "asset", rate: 0 } as const
		const unmarked = { ...listed, accounts: [CASH, bare] }
		const named = withdrawNotes(unmarked, { runsOut: RAN_OUT, rows }, "THB").join(" ")
		expect(named).toContain("home (6000.00)")
	})

	it("counts a locked Account once its lock has passed", () => {
		const later = { ...RAN_OUT, date: "2030-02-01" }
		const rows = [rowOn("2030-02-01", { cash: 50_000_000, vault: 7_000_000 })]
		const note = withdrawNotes(DOCUMENT, { runsOut: later, rows }, "THB").join(" ")
		expect(note).toContain("holding on that day: cash (500000.00), vault (70000.00).")
		expect(note).toContain(`--set 'cashflow.withdraw=["cash","vault"]'`)
	})

	it("says nothing when the Projection never ran out", () => {
		expect(withdrawNotes(DOCUMENT, { runsOut: undefined, rows: HELD }, "THB")).toEqual([])
	})

	it("names the side in a compare", () => {
		expect(withdrawNotes(DOCUMENT, RUN, "THB", "B").join(" ")).toStartWith("Side B's Scenario")
	})
})

describe("a Projection that ran out beside Accounts outside the withdraw list", () => {
	it("tells the reader which Accounts to add, in the notes of the run", async () => {
		const home = await projectionHome()
		const res = await projection(home, ["run", "--scenario", "base", ...dateFlags(), ...HUGE_RENT])
		expect(res.code).toBe(0)
		const body = runBody(res)
		expect(body.runsOut).not.toBeNull()
		expect(body.notes.join(" ")).toContain("is paid only from the Accounts in cashflow.withdraw")
	})

	it("adds nothing when the Projection holds out", async () => {
		const home = await projectionHome()
		const body = runBody(await projection(home, ["run", "--scenario", "base", ...dateFlags()]))
		expect(body.runsOut).toBeNull()
		expect(body.notes.join(" ")).not.toContain("cashflow.withdraw")
	})

	it("names the side in a compare", async () => {
		const home = await projectionHome()
		const res = await projection(home, ["compare", "base", ...dateFlags(), ...HUGE_RENT])
		expect(res.code).toBe(0)
		const notes = (JSON.parse(res.out) as CompareView).notes.join(" ")
		expect(notes).toContain("Side B's Scenario had")
		expect(notes).not.toContain("Side A's Scenario")
	})

	it("tells the reader in the notes of fi when the plan cannot hold out", async () => {
		const home = await projectionHome()
		const res = await fi(home, baseFlags("unreachable"))
		expect(res.code).toBe(0)
		const body = JSON.parse(res.out) as FiView
		expect(body.notes.join(" ")).toContain("is paid only from the Accounts in cashflow.withdraw")
	})
})
