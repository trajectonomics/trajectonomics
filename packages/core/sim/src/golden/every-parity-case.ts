import { ASSET_TRADE_PARITY_CASES } from "./asset-trade-cases"
import { CASHFLOW_PARITY_CASES } from "./cashflow-parity-cases"
import { CATEGORY_PARITY_CASES } from "./category-parity-cases"
import { PARITY_CASES, type ParityCase } from "./parity-cases"
import { REAL_ASSET_PARITY_CASES } from "./real-asset-cases"
import { STATEMENT_PARITY_CASES } from "./statement-parity-cases"

/**
 * Every parity fixture, in the order `parity/cases.json` records them. A new list of cases is added
 * here once, so no test or script that says "every parity fixture" can leave one out.
 */
export const EVERY_PARITY_CASE: readonly ParityCase[] = [
	...PARITY_CASES,
	...STATEMENT_PARITY_CASES,
	...CATEGORY_PARITY_CASES,
	...CASHFLOW_PARITY_CASES,
	...REAL_ASSET_PARITY_CASES,
	...ASSET_TRADE_PARITY_CASES,
]
