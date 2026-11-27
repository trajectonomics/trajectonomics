import { ASSET_TRADE_PARITY_CASES } from "./asset-trade-cases"
import { CASHFLOW_PARITY_CASES } from "./cashflow-parity-cases"
import { CATEGORY_PARITY_CASES } from "./category-parity-cases"
import { EMPLOYER_PARITY_CASES } from "./employer-cases"
import { ESTATE_PARITY_CASES } from "./estate-parity-cases"
import { FEE_PARITY_CASES } from "./fee-cases"
import { INFLATION_PARITY_CASES } from "./inflation-cases"
import { LIFETIME_PARITY_CASES } from "./lifetime-cases"
import { PARITY_CASES, type ParityCase } from "./parity-cases"
import { PATH_PARITY_CASES } from "./path-parity-cases"
import { PAYOUT_PARITY_CASES } from "./payout-cases"
import { PLAN_MODEL_PARITY_CASES } from "./plan-model-cases"
import { REAL_ASSET_PARITY_CASES } from "./real-asset-cases"
import { ROUTING_PARITY_CASES } from "./routing-parity-cases"
import { RULE_PARITY_CASES } from "./rule-parity-cases"
import { SAVINGS_PARITY_CASES } from "./savings-parity-cases"
import { STATEMENT_PARITY_CASES } from "./statement-parity-cases"
import { TRANSFER_PARITY_CASES } from "./transfer-parity-cases"

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
	...FEE_PARITY_CASES,
	...PLAN_MODEL_PARITY_CASES,
	...ROUTING_PARITY_CASES,
	...TRANSFER_PARITY_CASES,
	...PATH_PARITY_CASES,
	...LIFETIME_PARITY_CASES,
	...INFLATION_PARITY_CASES,
]
