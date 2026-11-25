import { describe, expect, it } from "bun:test"
import { TaxValidationError } from "../../core/money"
import type { ThLevyProfile } from "../levy/profile-types"
import { ThSeparateClaimCode, thSeparateClaimProblems } from "../levy/separate-claims"

const separate = (allowances: ThLevyProfile["allowances"]): ThLevyProfile => ({
	filingStatus: "married_separate",
	allowances,
})
const codes = (...args: Parameters<typeof thSeparateClaimProblems>) =>
	thSeparateClaimProblems(...args).map((problem) => [problem.code, problem.returns])

describe("OWN_PARENTS_OVER_TWO: a separate Return claims only its Filer's own two parents", () => {
	it("passes two own parents on each Return, in either form", () => {
		const slots = { taxpayerFather: true, taxpayerMother: true }
		expect(codes(separate({ parents: 2 }), separate({ parents: slots }))).toEqual([])
		expect(codes(separate({ parents: 0 }), separate({}))).toEqual([])
	})

	it("names the first Return when its count is three", () => {
		expect(codes(separate({ parents: 3 }), separate({ parents: 2 }))).toEqual([
			[ThSeparateClaimCode.OwnParentsOverTwo, [0]],
		])
	})

	it("names the second Return when it names three slots, spouse slots included", () => {
		const three = { taxpayerFather: true, taxpayerMother: true, spouseFather: true }
		expect(codes(separate({ parents: 1 }), separate({ parents: three }))).toEqual([
			[ThSeparateClaimCode.OwnParentsOverTwo, [1]],
		])
	})

	it("names each Return that is over, one problem per Return", () => {
		expect(codes(separate({ parents: 4 }), separate({ parents: 3 }))).toEqual([
			[ThSeparateClaimCode.OwnParentsOverTwo, [0]],
			[ThSeparateClaimCode.OwnParentsOverTwo, [1]],
		])
	})

	it("refuses an invalid count the way the emitter does", () => {
		expect(() => thSeparateClaimProblems(separate({ parents: -1 }), separate({}))).toThrow(
			TaxValidationError,
		)
	})
})

describe("MORTGAGE_OVER_CEILING: one co-borrowed loan has one 100,000 ceiling", () => {
	const interest = (mortgageInterest: number) => separate({ mortgageInterest })

	it("passes interest that adds up to the ceiling exactly", () => {
		const options = { sharedMortgage: true }
		expect(codes(interest(60_000), interest(40_000), options)).toEqual([])
	})

	it("names both Returns when the interest adds up to more than the ceiling", () => {
		const options = { sharedMortgage: true }
		expect(codes(interest(60_000), interest(40_000.01), options)).toEqual([
			[ThSeparateClaimCode.MortgageOverCeiling, [0, 1]],
		])
		expect(codes(interest(100_000), interest(100_000), options)).toHaveLength(1)
	})

	it("is silent unless the caller says the two Returns share one loan", () => {
		expect(codes(interest(100_000), interest(100_000))).toEqual([])
		expect(codes(interest(100_000), interest(100_000), { sharedMortgage: false })).toEqual([])
	})

	it("treats an unstated interest as zero", () => {
		expect(codes(interest(100_000), separate({}), { sharedMortgage: true })).toEqual([])
	})
})

describe("the two rules are reported together, own parents first", () => {
	it("returns each code once its rule is broken", () => {
		const first = separate({ parents: 3, mortgageInterest: 80_000 })
		const second = separate({ mortgageInterest: 80_000 })
		expect(codes(first, second, { sharedMortgage: true })).toEqual([
			[ThSeparateClaimCode.OwnParentsOverTwo, [0]],
			[ThSeparateClaimCode.MortgageOverCeiling, [0, 1]],
		])
	})
})
