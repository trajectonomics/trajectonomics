import type { WithdrawEntry } from "@trajectonomics/core/sim"

/** The Account a `cashflow.withdraw` entry draws, whether it is a plain id or carries a Reserve floor. */
export function withdrawAccount(entry: WithdrawEntry): string {
	return typeof entry === "string" ? entry : entry.account
}
