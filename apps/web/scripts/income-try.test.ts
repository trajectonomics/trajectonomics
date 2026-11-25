// The fee tried in a What-if session against the real traj: nothing is written, and the fund is charged what the tried
// share says (cli ADR 0062, 0067; web ADR 0010, 0017).
import { afterAll, afterEach, beforeAll, describe, expect } from "bun:test"
import { accountItems } from "../src/lib/view/what-if/plan-items"
import { readsOf } from "../src/lib/what-if/lens"
import { shownAccount } from "../src/lib/what-if/overlay"
import { overridesOf, recordOf, startWhatIf } from "../src/lib/what-if/session"
import { withTriedItem } from "../src/lib/what-if/try-flow"
import { SLOW_MS } from "./edit-fixture.test-support"
import { settle } from "./editor-running.test-support"
import {
	minor,
	oracle,
	runOf,
	saveEmployerShare,
	savePayoutAndFee,
	slow,
	snapshotOf,
} from "./income.test-support"
import {
	disposeIncome,
	PLAN,
	setupIncome,
	storedPlan,
	tryWhatIf,
} from "./income-ledger.test-support"

let ids = { fund: "", bank: "" }
beforeAll(async () => {
	ids = await setupIncome()
}, SLOW_MS)
afterAll(disposeIncome)
afterEach(settle, SLOW_MS)

describe("the fee changed in a What-if session", () => {
	slow(
		"half a per cent charges the fund what the same walk by hand says, and the saved plan keeps its 1%",
		async () => {
			await saveEmployerShare()
			const snapshot = snapshotOf(await savePayoutAndFee(ids.fund))
			const stored = storedPlan()
			const fund = stored.document.accounts.find((one) => one.id === ids.fund)
			if (fund === undefined) throw new Error("no fund")
			const edited = { ...recordOf(fund), fee: { bps: "0.50", rounding: "floor" } }
			const session = withTriedItem(startWhatIf(PLAN, stored.hash), "accounts", {
				stored: recordOf(fund),
				edited: { ...edited, id: ids.fund },
			})
			expect(session.sets.map((set) => set.path)).toEqual([`accounts.${ids.fund}.fee`])
			const lens = readsOf(await tryWhatIf({ plan: PLAN, ...overridesOf(session) }))
			if (lens.run === null) throw new Error("no what-if run")
			const baseline = snapshot.reads.baseline
			const row = baseline.ok
				? baseline.data.rows.find((one) => one.account.id === ids.fund)
				: undefined
			const worked = oracle(minor(row?.amount ?? "0"), 50n)
			const fees = lens.run.tables.flatMap((table) => (table.name === "fees" ? table.rows : []))
			expect(minor(fees[0]?.amount ?? "0")).toBe(worked.fees)
			expect(minor(fees[0]?.amount ?? "0")).toBeLessThan(731629n)
			expect(runOf(snapshot).tables.some((table) => table.name === "fees")).toBe(true)
			expect(storedPlan().document.accounts.find((one) => one.id === ids.fund)?.fee).toMatchObject({
				bps: "1.00",
			})
			const card = accountItems(
				stored.document,
				baseline,
				{ sets: session.sets, removals: [] },
				{ run: runOf(snapshot), tried: lens.run },
			).cards.find((one) => one.id === ids.fund)
			expect(card?.fee).toBe("Fee 0.5% a year")
			expect(card?.years[0]?.fee).toBe(fees[0]?.amount)
		},
	)

	slow(
		"a fee the fund did not have is one Set of the whole Account, and traj takes it",
		async () => {
			const stored = storedPlan()
			const fund = stored.document.accounts.find((one) => one.id === ids.fund)
			if (fund === undefined) throw new Error("no fund")
			const { fee: _fee, payout: _payout, ...bare } = fund
			const session = withTriedItem(startWhatIf(PLAN, stored.hash), "accounts", {
				stored: recordOf(bare),
				edited: { ...recordOf(bare), id: ids.fund, fee: { bps: "2.00", rounding: "floor" } },
			})
			expect(session.sets.map((set) => set.path)).toEqual([`accounts.${ids.fund}`])
			const lens = readsOf(await tryWhatIf({ plan: PLAN, ...overridesOf(session) }))
			expect(lens.run?.tables.some((table) => table.name === "fees")).toBe(true)
		},
	)

	slow(
		"a rate and then a fee tried on the same fund both stay in the session, and traj takes the two",
		async () => {
			const stored = storedPlan()
			const fund = stored.document.accounts.find((one) => one.id === ids.fund)
			if (fund === undefined) throw new Error("no fund")
			const rate = { ...recordOf(fund), id: ids.fund, rate: 700 }
			const first = withTriedItem(startWhatIf(PLAN, stored.hash), "accounts", {
				stored: recordOf(fund),
				edited: rate,
			})
			// The drawer starts its form from the Account as the session shows it, then tries the fee on top.
			const start = shownAccount(stored.document, overridesOf(first), ids.fund)
			if (start === undefined) throw new Error("no shown fund")
			const session = withTriedItem(first, "accounts", {
				stored: recordOf(fund),
				edited: { ...recordOf(start), id: ids.fund, fee: { bps: "0.50", rounding: "floor" } },
			})
			expect(session.sets.map((set) => set.path).sort()).toEqual([
				`accounts.${ids.fund}.fee`,
				`accounts.${ids.fund}.rate`,
			])
			expect(shownAccount(stored.document, overridesOf(session), ids.fund)).toMatchObject({
				rate: 700,
				fee: { bps: "0.50" },
			})
			const lens = readsOf(await tryWhatIf({ plan: PLAN, ...overridesOf(session) }))
			expect(lens.run?.tables.some((table) => table.name === "fees")).toBe(true)
		},
	)
})
