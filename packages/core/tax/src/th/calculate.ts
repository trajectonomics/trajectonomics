import type { ThTaxResult } from "./result"
import { runThTaxPipeline } from "./stages/pipeline"
import type { ThTaxInput } from "./types"

/**
 * Calculates Thailand Personal Income Tax (ภ.ง.ด.90/91) under Revenue Code.
 *
 * Defaults to tax year 2026 and single filing status.
 *
 * @param input Taxpayer assessable income, allowances, filing status, and withholding.
 * @returns Fully typed, immutable TaxResult with statutory breakdown and the `assumptions` it
 * relied on.
 *
 * @statute Thailand Revenue Code Sections 40, 42 bis, 47, 48(1)–(2).
 */
export function calculateThTax(input: ThTaxInput = {}): ThTaxResult {
	return runThTaxPipeline(input)
}
