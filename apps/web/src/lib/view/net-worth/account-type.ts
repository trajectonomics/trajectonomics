import type { AccountType } from "../../contract"

const LABELS: Readonly<Record<AccountType, string>> = {
	asset: "Asset",
	liability: "Liability",
	equity: "Equity",
	income: "Income",
	expense: "Expense",
}

/** The reader's word for an account's kind, such as "Asset". */
export function accountTypeLabel(type: AccountType): string {
	return LABELS[type]
}
