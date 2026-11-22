import { describe, expect, it } from "bun:test"
import { calculateThTax } from "../calculate"
import { TH_2026_PARAMETERS } from "../parameters"
import { evaluateThBrackets } from "../stages/bracket-eval"
import { toTaxInput } from "./invariants-input"
import { randomProfile } from "./invariants-profile"
import { forAllSeeded, type SeededRandom } from "./invariants-random"

const SEED = 52_002
const CASES = 250
const TOP_RATE = Math.max(...TH_2026_PARAMETERS.brackets.map((bracket) => bracket.rate))
/** One satang: the smallest amount the engine represents, so the continuity bound allows it. */
const SATANG = 0.01

function progressiveTax(taxable: number): number {
	return evaluateThBrackets(taxable, taxable).totalTax
}

function boundaries(): readonly number[] {
	return TH_2026_PARAMETERS.brackets.flatMap((bracket) =>
		bracket.upTo === null ? [] : [bracket.upTo],
	)
}

describe("Thai PIT invariant: tax is never negative", () => {
	it("keeps total tax, progressive tax and taxable income at or above zero", () => {
		forAllSeeded(
			"non-negative tax",
			SEED,
			CASES,
			(rng) => randomProfile(rng),
			(profile) => {
				const result = calculateThTax(toTaxInput(profile))
				expect(result.totalTax).toBeGreaterThanOrEqual(0)
				expect(result.taxableIncome).toBeGreaterThanOrEqual(0)
				expect(result.breakdown.progressiveTax).toBeGreaterThanOrEqual(0)
			},
		)
	})
})

describe("Thai PIT invariant: each bracket boundary is continuous", () => {
	it("moves progressive tax by at most the top rate per baht across every boundary", () => {
		for (const bound of boundaries()) {
			for (const step of [SATANG, 1, 250.37]) {
				const at = progressiveTax(bound)
				const bump = TOP_RATE * step + SATANG
				expect(Math.abs(progressiveTax(bound + step) - at)).toBeLessThanOrEqual(bump)
				expect(Math.abs(at - progressiveTax(bound - step))).toBeLessThanOrEqual(bump)
			}
		}
	})

	it("keeps one-satang steps continuous at seeded taxable incomes", () => {
		forAllSeeded(
			"bracket continuity",
			SEED + 1,
			CASES,
			(rng: SeededRandom) => rng.int(0, 6_000_000 * 100) / 100,
			(taxable) => {
				const delta = Math.abs(progressiveTax(taxable + SATANG) - progressiveTax(taxable))
				expect(delta).toBeLessThanOrEqual(TOP_RATE * SATANG + SATANG)
			},
		)
	})
})
