import type { Currency } from "./currency"
import type { AccountId } from "./ids"

/** The five canonical account types. Opening balances use `equity`; there is no sixth type. */
export type AccountType = "asset" | "liability" | "equity" | "income" | "expense"

/** Side on which an account type normally grows. Debit is `+`, credit is `-`. */
export type NormalBalance = "debit" | "credit"

/** An account as supplied by a caller, before validation. */
export interface AccountInput {
	readonly id: string
	readonly type: AccountType
	readonly currency: string
	/** Legal/accounting entity that owns the account. Defaults to `"default"`. */
	readonly entityId?: string
	/** Header/summary account this account rolls up into. */
	readonly parentId?: string
}

/** A validated account. Only {@link createChartOfAccounts} produces these. */
export interface Account {
	readonly id: AccountId
	readonly type: AccountType
	readonly currency: Currency
	readonly entityId: string
	readonly parentId?: AccountId
}

/** `asset` and `expense` are debit-normal; `liability`, `equity` and `income` credit-normal. */
export const normalBalance = (type: AccountType): NormalBalance =>
	type === "asset" || type === "expense" ? "debit" : "credit"

/**
 * A signed Balance (Debit positive) on its account type's Normal Balance side: an asset's Debit
 * balance, what a liability owes. The flip is its own inverse, so it also takes a stated value
 * back to a signed one.
 */
export const statedAmount = (type: AccountType, amount: number): number =>
	normalBalance(type) === "debit" ? amount : 0 - amount
