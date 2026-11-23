// The estate block's refusals against the real traj: each is in the CLI's own words, and its path, in the index form of the
// core or the id form of the decimal conversion, names the form field it is shown at (cli ADR 0064, web ADR 0014).
import { afterAll, beforeAll, describe, expect } from "bun:test"
import { type EstateBlock, scenarioDocument } from "../src/lib/contract"
import { withEstate } from "../src/lib/view/estate"
import { estateFieldOfRefusal, layoutOf } from "../src/lib/view/estate/refusal"
import { SLOW_MS } from "./edit-fixture.test-support"
import { slow, withoutLines } from "./estate.test-support"
import {
	accountIds,
	disposeEstate,
	PLAN,
	post,
	setupEstate,
	storedPlan,
} from "./estate-ledger.test-support"

beforeAll(async () => {
	await setupEstate()
}, SLOW_MS)
afterAll(disposeEstate)

/** The refusal of a block the form could not make, sent as the page's Edit would send it, and the field it names. */
async function refused(block: EstateBlock) {
	await withoutLines()
	const stored = storedPlan()
	const answer = await post("edit", {
		kind: "apply-plan",
		name: PLAN,
		contentHash: stored.hash,
		document: scenarioDocument.parse(withEstate(stored.document, block)),
	})
	if (answer.ok) throw new Error("the CLI took it")
	return { error: answer.error, field: estateFieldOfRefusal(answer.error, layoutOf(block)) }
}

const share = { id: "settlement", of: "gross", bps: "1.00", rounding: "halfUp" as const }

describe("a refusal is in the CLI's words, at the field its path names", () => {
	slow("a share above 100% is the core's index form, and lands on the share", async () => {
		const { error, field } = await refused({ costs: [{ ...share, bps: "101.00" }] })
		expect(error.path).toBe("document.estate.costs.0.bps")
		expect(field).toBe("costs.0.share")
	})

	slow(
		"a share with a third place is the conversion's id form, and lands on the same field",
		async () => {
			const { error, field } = await refused({ costs: [{ ...share, bps: "1.005" }] })
			expect(error.path).toBe("document.estate.costs.settlement.bps")
			expect(error.message).toContain("more than 2 decimal places")
			expect(field).toBe("costs.0.share")
		},
	)

	slow(
		"an unknown Account and a liability as the base land on the accounts of the cost",
		async () => {
			const unknown = await refused({ costs: [{ ...share, of: { accounts: ["nowhere"] } }] })
			expect(unknown.field).toBe("costs.0.accounts")
			const { loan } = accountIds()
			const liability = await refused({ costs: [{ ...share, of: { accounts: [loan] } }] })
			expect(liability.error.message).toContain("liability Account")
			expect(liability.field).toBe("costs.0.accounts")
		},
	)

	slow(
		"a fixed amount with no growth, a negative amount and a gift of the gross land on their fields",
		async () => {
			expect((await refused({ costs: [{ id: "fee", amount: "100.00" }] })).field).toBe(
				"costs.0.growth",
			)
			const negative = await refused({
				costs: [{ id: "fee", amount: "-5.00", growth: "inflation" }],
			})
			expect(negative.field).toBe("costs.0.amount")
			const gift = await refused({ gifts: [{ ...share, id: "temple" }] })
			expect(gift.field).toBe("gifts.0.of")
		},
	)

	slow(
		"a share with no rounding and a repeated name land on the rounding and the name",
		async () => {
			const { rounding: _rounding, ...bare } = share
			expect((await refused({ costs: [bare] })).field).toBe("costs.0.rounding")
			const twice = await refused({ costs: [share, { ...share, bps: "2.00" }] })
			expect(twice.field).toBe("costs.1.name")
		},
	)
})
