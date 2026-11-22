/** The persona's shape, shared by the loader, the oracle, the prompt and the tests. */

/** The tax labels the oracle and the CLI both read; a Flow carries one of these or none. */
export const INCOME_LABELS = ["income.section40_1", "income.section40_8.general"] as const
/** The fixed allowances a persona may state (ThAllowancesInput keys shared with the Levy). */
export const ALLOWANCE_KEYS = [
	"socialSecurity",
	"lifeInsurance",
	"healthInsurance",
	"mortgageInterest",
] as const

/** One fictional persona: the conversation the agent receives, and the facts the oracle computes from. */
export interface Persona {
	readonly id: string
	readonly title: string
	readonly asOf: string
	readonly horizon: string
	readonly inflationBps: number
	readonly conversation: string
	readonly accounts: readonly PersonaAccount[]
	readonly flows: readonly PersonaFlow[]
	readonly cashflow: { readonly surplusTo: string; readonly withdrawFrom: readonly string[] }
	readonly tax: {
		readonly filingStatus: "single" | "married_no_income_spouse"
		readonly children: readonly { readonly birthYear: number }[]
		readonly allowances: Partial<Record<(typeof ALLOWANCE_KEYS)[number], number>>
	}
	readonly whatIf: {
		readonly description: string
		readonly flowId: string
		readonly monthlyBaht: number
	}
}

/** An account the persona holds at the As-of: an asset or a liability, with its rate and opening balance. */
export interface PersonaAccount {
	readonly id: string
	readonly name: string
	readonly kind: "asset" | "liability"
	readonly rateBps: number
	readonly openingBaht: number
}

/** A recurring monthly money flow the persona states: income, an expense, or a contribution to an account. */
export interface PersonaFlow {
	readonly id: string
	readonly kind: "income" | "expense" | "contribution"
	readonly earned?: boolean | undefined
	readonly label?: (typeof INCOME_LABELS)[number] | undefined
	readonly monthlyBaht: number
	readonly target?: string | undefined
	readonly growth: "inflation" | "none"
}
