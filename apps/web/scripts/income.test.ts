// An employer's share, a payout and a fee against the real traj: a salary of 100,000.00 a month to 1 July 2027, the
// provident fund the employer pays 5% into, and a fund of 736,600.00 that pays out 3.5% a quarter from retirement and is
// charged 1% (sim ADR 0026, 0027, 0028; cli ADR 0067; web ADR 0017). The what-if is in `income-try.test.ts`.
import { afterAll, beforeAll, describe, expect } from "bun:test"
import { chooseRollup, rollupsOf, sectionsOf } from "../src/lib/view/cashflow/cashflow"
import { lineLabel } from "../src/lib/view/cashflow/cashflow-labels"
import { fieldOfRefusal, namedRefusal } from "../src/lib/view/plan-items/refusal"
import { accountItems, flowItems } from "../src/lib/view/what-if/plan-items"
import { SLOW_MS } from "./edit-fixture.test-support"
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
	PROVIDENT,
	post,
	setupIncome,
	storedPlan,
} from "./income-ledger.test-support"

let ids = { fund: "", bank: "" }
beforeAll(async () => {
	ids = await setupIncome()
}, SLOW_MS)
afterAll(disposeIncome)

describe("the employer's 5% of a salary", () => {
	slow(
		"is one Contribution that reads the salary, saved with it, and the salary's card says so",
		async () => {
			const answer = await saveEmployerShare()
			const snapshot = snapshotOf(answer)
			const doc = storedPlan().document
			expect(doc.flows.map((flow) => flow.id)).toEqual(["salary", "salary-employer"])
			expect(doc.flows[1]).toMatchObject({
				kind: "contribution",
				funding: "employer",
				target: PROVIDENT,
				endAt: "retire",
				start: "2027-01-01",
			})
			const read = snapshot.reads.documents[PLAN]
			if (read === undefined || !read.ok) throw new Error("no document")
			const card = flowItems(read.data.scenario.document, "income", null, null).cards[0]
			expect(card?.employer).toBe(`Employer adds 5% to ${PROVIDENT}`)
		},
	)

	slow(
		"lands 30,000.00 in the account over the six months of salary, its own inflow outside money in",
		async () => {
			const run = runOf(snapshotOf(await saveEmployerShare()))
			const annual = run.tables.find((table) => table.name === "annual")
			expect(annual?.name === "annual" && annual.rows[0]?.employerContributions).toBe("30000.00")
			const rollup = chooseRollup(rollupsOf(run), "0")
			if (rollup === null) throw new Error("no roll-up")
			const sections = sectionsOf(rollup)
			const employer = sections.find((section) => section.total === "from your employer")
			expect(
				employer?.parts[0]?.lines.map((line) => [lineLabel(line, new Map()), line.amount]),
			).toEqual([[`salary-employer (employer) into ${PROVIDENT}`, "30000.00"]])
			expect(sections.find((section) => section.total === "money in")?.amount).toBe("600000.00")
		},
	)

	slow("saving the salary again moves nothing, and a 7.5% share is 45,000.00", async () => {
		const run = runOf(snapshotOf(await saveEmployerShare("7.5")))
		const line = run.tables
			.flatMap((table) => (table.name === "cashflow" ? table.rows : []))
			.find((one) => one.group === "employer")
		expect(line?.amount).toBe("45000.00")
		expect(
			storedPlan().document.flows.filter((flow) => flow.id === "salary-employer"),
		).toHaveLength(1)
		await saveEmployerShare("5")
	})

	slow(
		"a Thai contribution label on an employer share is refused by traj, and the refusal lands in the employer section",
		async () => {
			await saveEmployerShare()
			const stored = storedPlan()
			const flows = stored.document.flows.map((flow) =>
				flow.id === "salary-employer" ? { ...flow, label: "allowance.retirement.pvd" } : flow,
			)
			const answer = await post("edit", {
				kind: "apply-plan",
				name: PLAN,
				contentHash: stored.hash,
				document: { ...stored.document, flows },
			})
			expect(answer.ok).toBe(false)
			if (answer.ok) return
			const fields = [
				"amount",
				"start",
				"end",
				"earned",
				"employerAccount",
				"employerShare",
				"employerRounding",
			]
			const named = namedRefusal(
				answer.error,
				flows.map((flow) => flow.id),
			)
			expect(fieldOfRefusal(named, fields)).toBe("employerAccount")
		},
	)
})

describe("a quarterly payout from retirement and a 1% fee", () => {
	slow("the card reads what the fund pays out and costs", async () => {
		const snapshot = snapshotOf(await savePayoutAndFee(ids.fund))
		const read = snapshot.reads.documents[PLAN]
		if (read === undefined || !read.ok) throw new Error("no document")
		const cards = accountItems(read.data.scenario.document, snapshot.reads.baseline, null, {
			run: runOf(snapshot),
		}).cards
		const card = cards.find((one) => one.id === ids.fund)
		expect(card).toMatchObject({
			payout: "Pays out 3.5% a year from retire",
			payoutHow: "Paid quarterly",
			fee: "Fee 1% a year",
		})
	})

	slow(
		"the payouts of 2027 and the fees are the numbers worked by hand, and the card lists each year as stated",
		async () => {
			const snapshot = snapshotOf(await savePayoutAndFee(ids.fund))
			const baseline = snapshot.reads.baseline
			const row = baseline.ok
				? baseline.data.rows.find((one) => one.account.id === ids.fund)
				: undefined
			const worked = oracle(minor(row?.amount ?? "0"), 100n)
			expect([worked.fees, worked.payouts]).toEqual([731629n, 1273288n])
			const read = snapshot.reads.documents[PLAN]
			if (read === undefined || !read.ok) throw new Error("no document")
			const card = accountItems(read.data.scenario.document, baseline, null, {
				run: runOf(snapshot),
			}).cards.find((one) => one.id === ids.fund)
			expect(card?.years[0]).toMatchObject({
				index: 0,
				from: "2027-01-01",
				to: "2027-12-31",
				payout: "12732.88",
				fee: "7316.29",
			})
			expect(card?.years).toHaveLength(3)
		},
	)

	slow(
		"the Cash flow page lists the payout under money in, and money in is the CLI's total with it",
		async () => {
			const run = runOf(snapshotOf(await savePayoutAndFee(ids.fund)))
			const rollup = chooseRollup(rollupsOf(run), "0")
			if (rollup === null) throw new Error("no roll-up")
			const money = sectionsOf(rollup).find((section) => section.total === "money in")
			expect(money?.parts[0]?.lines.map((line) => [line.group, line.amount])).toEqual([
				["income", "600000.00"],
				["payout", "12732.88"],
			])
			expect(money?.amount).toBe("612732.88")
		},
	)
})
