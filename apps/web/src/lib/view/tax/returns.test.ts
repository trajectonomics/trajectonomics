import { describe, expect, test } from "bun:test"
import type { TaxYear } from "../../contract"
import { projectionRun } from "../compare/projection.test-support"
import { returnOf, returnsOf, taxBody, taxBodyOf } from "."
import { plainYear } from "./brackets.test-support"

const ME = plainYear({ levy: "th-2026-pit@me", filer: "me", owed: "80000.00" })
const ME_2027 = plainYear({
	levy: "th-2026-pit@me",
	filer: "me",
	from: "2027-01-01",
	to: "2027-12-31",
	settlementDate: "2028-03-31",
	owed: "91080.00",
})
const PARTNER = plainYear({ levy: "th-2026-pit@partner", filer: "partner", owed: "4600.00" })

describe("the Returns a projection states", () => {
	test("groups the years by Filer, in the CLI's order, each year where the CLI wrote it", () => {
		const returns = returnsOf([ME, ME_2027, PARTNER])
		expect(returns.map((one) => one.filer)).toEqual(["me", "partner"])
		expect(returns[0]?.years.map((year) => year.from)).toEqual(["2026-01-01", "2027-01-01"])
		expect(returns[1]?.years).toEqual([PARTNER])
	})

	test("is empty for one Return, whose years carry no filer, so the page shows it as it always has", () => {
		expect(returnsOf([plainYear(), plainYear({ from: "2027-01-01" })])).toEqual([])
	})

	test("names the Return asked for, and the first when the page names none or an unknown one", () => {
		const returns = returnsOf([ME, PARTNER])
		expect(returnOf(returns, "partner")?.filer).toBe("partner")
		expect(returnOf(returns, "")?.filer).toBe("me")
		expect(returnOf(returns, "ghost")?.filer).toBe("me")
		expect(returnOf([], "me")).toBeNull()
	})
})

describe("one Return's body", () => {
	test("holds only that Return's figures: its headline, its rows and its rates", () => {
		const years: TaxYear[] = [ME, ME_2027, PARTNER]
		const mine = taxBodyOf(
			years.filter((year) => year.filer === "me"),
			"applied",
			"2026-10-31",
		)
		if (mine.kind !== "levies") throw new Error("expected one Return's levies")
		expect(mine.headline.levy).toBe("th-2026-pit@me")
		expect(mine.headline.owed).toBe("80000.00")
		expect(mine.rows.map((row) => row.owed)).toEqual(["80000.00", "91080.00"])
	})

	test("is the same body taxBody makes of one Return, and carries no Levy when none is applied", () => {
		const one = taxBodyOf([plainYear()], "applied", "2026-10-31")
		expect(one).toEqual(taxBody(projectionRun({ taxYears: [plainYear()] })))
		expect(taxBodyOf([plainYear()], "not_applied", "2026-10-31")).toEqual({ kind: "no-levy" })
	})
})
