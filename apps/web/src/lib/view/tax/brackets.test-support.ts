import type { TaxBracket, TaxYear } from "../../contract"

const EDGES: readonly (readonly [string, string | null, number])[] = [
	["0.00", "150000.00", 0],
	["150000.00", "300000.00", 500],
	["300000.00", "500000.00", 1000],
	["500000.00", "750000.00", 1500],
	["750000.00", "1000000.00", 2000],
	["1000000.00", "2000000.00", 2500],
	["2000000.00", "5000000.00", 3000],
	["5000000.00", null, 3500],
]

/** Thailand's 2026 schedule with the income and tax each bracket held, as the CLI states them (hand-made). */
export function schedule(slices: readonly (readonly [string, string])[]): TaxBracket[] {
	return EDGES.map(([from, upTo, rateBps], index) => ({
		from,
		upTo,
		rateBps,
		income: slices[index]?.[0] ?? "0.00",
		tax: slices[index]?.[1] ?? "0.00",
	}))
}

/** A hand-written Levy's tax year: none of the walk, the brackets or the rates. */
export function plainYear(over: Partial<TaxYear> = {}): TaxYear {
	return {
		levy: "th-2026-pit",
		from: "2026-01-01",
		to: "2026-12-31",
		settlementDate: "2027-03-31",
		due: "17500.00",
		prepaid: "0.00",
		owed: "17500.00",
		settled: true,
		partial: false,
		assumptions: [],
		...over,
	}
}

/** A Thai Levy's year the CLI walked: 560,000 assessable, 400,000 taxable, ending in the 10% bracket. */
export function walkedYear(over: Partial<TaxYear> = {}): TaxYear {
	return plainYear({
		walk: {
			assessable: "560000.00",
			expenses: "100000.00",
			allowances: "60000.00",
			taxableIncome: "400000.00",
		},
		brackets: schedule([
			["150000.00", "0.00"],
			["150000.00", "7500.00"],
			["100000.00", "10000.00"],
		]),
		marginalRateBps: 1000,
		toNextBracket: "100000.00",
		effectiveRateBps: 312,
		...over,
	})
}
