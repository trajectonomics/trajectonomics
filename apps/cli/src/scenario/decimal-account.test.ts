import { describe, expect, it } from "bun:test"
import { isAppError } from "../errors"
import { fromDecimalForm } from "./decimal"
import { type Doc, decimalOk, worked } from "./decimal-test-support"
import { PAYOUT_ACCOUNT } from "./shape/example-income"

/*
 * An Account's payout and fee in the decimal form (cli ADR-0067): their `bps` is a percent string, and
 * the document round-trips exactly, as a spending rule's rates do (cli ADR-0063). A payout's own
 * `prepayments` follow the income Flow's form, so their `bps` stays an integer.
 */

/** The worked example with the payout Account added, and a prepayment on its payout. */
function withFund(bps: number, feeBps: number): Doc {
	const minor = worked()
	const fund = {
		...PAYOUT_ACCOUNT,
		payout: { ...PAYOUT_ACCOUNT.payout, bps, prepayments: [{ levy: "th-2026", bps: 1000 }] },
		fee: { ...PAYOUT_ACCOUNT.fee, bps: feeBps },
	}
	return { ...minor, accounts: [...(minor["accounts"] as Doc[]), fund] }
}

const fundOf = (document: Doc): Doc =>
	(document["accounts"] as Doc[]).find((account) => account["id"] === "dividend-fund") as Doc

describe("an Account's payout and fee in the decimal form", () => {
	it("writes the shares as percent strings and leaves the prepayments as basis points", () => {
		const fund = fundOf(decimalOk(withFund(350, 150)))
		expect(fund["payout"]).toMatchObject({
			bps: "3.50",
			prepayments: [{ levy: "th-2026", bps: 1000 }],
		})
		expect(fund["fee"]).toMatchObject({ bps: "1.50" })
	})

	it("round-trips every share exactly, every basis point from 1 to 10000 included", () => {
		for (const bps of [1, 9, 10, 99, 100, 101, 350, 9_999, 10_000]) {
			const minor = withFund(bps, 10_001 - bps)
			expect(fromDecimalForm(decimalOk(minor)), String(bps)).toEqual(minor)
		}
	})

	it("reads a share with a third place that is not zero as no whole number of basis points, at its path", () => {
		const decimal = decimalOk(withFund(350, 150))
		const fund: Doc = { ...fundOf(decimal), fee: { bps: "1.505", rounding: "halfUp" } }
		const accounts = (decimal["accounts"] as Doc[]).map((a) => (a["id"] === fund["id"] ? fund : a))
		const error = fromDecimalForm({ ...decimal, accounts })
		expect(isAppError(error) && error.body.path).toBe("document.accounts.dividend-fund.fee.bps")
		expect(isAppError(error) && error.body.message).toContain("more than 2 decimal places")
	})

	it("refuses a JSON number where a percent string is written", () => {
		const decimal = decimalOk(withFund(350, 150))
		const fund: Doc = {
			...fundOf(decimal),
			payout: { ...(fundOf(decimal)["payout"] as Doc), bps: 3.5 },
		}
		const accounts = (decimal["accounts"] as Doc[]).map((a) => (a["id"] === fund["id"] ? fund : a))
		const error = fromDecimalForm({ ...decimal, accounts })
		expect(isAppError(error) && error.body.path).toBe("document.accounts.dividend-fund.payout.bps")
	})
})
