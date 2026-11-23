import { ASSET_TRADE_PARITY_CASES } from "./asset-trade-cases"
import { CASHFLOW_PARITY_CASES } from "./cashflow-parity-cases"
import { CATEGORY_PARITY_CASES } from "./category-parity-cases"
import { EMPLOYER_PARITY_CASES } from "./employer-cases"
import { ESTATE_PARITY_CASES } from "./estate-parity-cases"
import { PARITY_CASES, type ParityCase } from "./parity-cases"
import { PAYOUT_PARITY_CASES } from "./payout-cases"
import { REAL_ASSET_PARITY_CASES } from "./real-asset-cases"
import { RULE_PARITY_CASES } from "./rule-parity-cases"
import { SAVINGS_PARITY_CASES } from "./savings-parity-cases"
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
	...SAVINGS_PARITY_CASES,
	...RULE_PARITY_CASES,
	...ESTATE_PARITY_CASES,
	...EMPLOYER_PARITY_CASES,
	...PAYOUT_PARITY_CASES,
]
