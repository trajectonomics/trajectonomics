import { describe, expect, it } from "bun:test"
import type { Scenario } from "@trajectonomics/core/sim"
import type { CompareView } from "./projection/compare-view"
import { dateFlags, projection, projectionHome } from "./projection/testing"
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
const HUGE_RENT = ["--set", "flows.rent.amount=900000000"]
const RAN_OUT = { date: "2027-03-31", unmet: 12_500_000 }

describe("the withdraw sentence", () => {
	it("names the unlisted asset Account, the amount, and the exact change to make", () => {
		const [note] = withdrawNotes(DOCUMENT, RAN_OUT, "THB")
		expect(note).toContain("125000.00")
		expect(note).toContain("2027-03-31")
		expect(note).toContain("not in it: cash.")
		expect(note).toContain(`--set 'cashflow.withdraw=["cash"]'`)
	})

	it("skips a locked Account, a liability, and an Account already listed", () => {
		const listed = { ...DOCUMENT, cashflow: { ...DOCUMENT.cashflow, withdraw: ["cash"] } }
		expect(withdrawNotes(listed, RAN_OUT, "THB")).toEqual([])
	})

	it("counts a locked Account once its lock has passed", () => {
		const note = withdrawNotes(DOCUMENT, { ...RAN_OUT, date: "2030-02-01" }, "THB").join(" ")
		expect(note).toContain("not in it: cash, vault.")
	})

	it("says nothing when the Projection never ran out", () => {
		expect(withdrawNotes(DOCUMENT, undefined, "THB")).toEqual([])
	})

	it("names the side in a compare", () => {
		expect(withdrawNotes(DOCUMENT, RAN_OUT, "THB", "B").join(" ")).toStartWith("Side B's Scenario")
	})
})

describe("a Projection that ran out beside Accounts outside the withdraw list", () => {
	it("tells the reader which Accounts to add, in the notes of the run", async () => {
		const home = await projectionHome()
		const res = await projection(home, ["run", "--scenario", "base", ...dateFlags(), ...HUGE_RENT])
		expect(res.code).toBe(0)
		const body = runBody(res)
		expect(body.runsOut).not.toBeNull()
		expect(body.notes.join(" ")).toContain("Expenses and tax Settlements are paid only from")
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
})
