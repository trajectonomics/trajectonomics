import type { Baseline, Read, ScenarioAccount } from "../../contract"
import { formatBps } from "../../format/bps"

/** The compounding periods an Account's rate may name; none means an effective yearly rate. */
export const COMPOUNDINGS = ["monthly", "quarterly", "semiannual", "annual"] as const

/** One Account as a card. The balance is the Baseline's amount, or null when the Baseline has none. */
export interface AccountCard {
	readonly id: string
	readonly kind: "asset" | "liability"
	/** The rate as a percent, such as "3.00%". */
	readonly rate: string
	readonly compounding: string | null
	readonly lockedUntil: string | null
	readonly balance: string | null
}

/** The Baseline's amount for an Account: its ledger id or its name is the Scenario's id for it. */
export function balanceOf(
	account: ScenarioAccount,
	baseline: Read<Baseline> | undefined,
): string | null {
	if (baseline === undefined || !baseline.ok) return null
	const row = baseline.data.rows.find(
		(item) => item.account.id === account.id || item.account.name === account.id,
	)
	return row?.amount ?? null
}

/** The Accounts of a Scenario as cards, in the document's order, with the Baseline's balance beside each. */
export function accountCards(
	accounts: readonly ScenarioAccount[],
	baseline: Read<Baseline> | undefined,
): AccountCard[] {
	return accounts.map((account) => ({
		id: account.id,
		kind: account.kind,
		rate: `${formatBps(account.rate)}%`,
		compounding: account.compounding ?? null,
		lockedUntil: account.lockedUntil ?? null,
		balance: balanceOf(account, baseline),
	}))
}

/** The form's text for one Account. A new Account is an asset, with no compounding and no lock. */
export interface AccountDraft {
	readonly name: string
	/** "asset" or "liability", as text so a form can bind it; the schema refuses any other value. */
	readonly kind: string
	readonly rate: string
	readonly compounding: string
	readonly lockedUntil: string
}

/** The draft of an Account to edit, or of a new one when there is no Account. */
export function accountDraftOf(account?: ScenarioAccount): AccountDraft {
	return {
		name: account?.id ?? "",
		kind: account?.kind ?? "asset",
		rate: account === undefined ? "" : formatBps(account.rate),
		compounding: account?.compounding ?? "",
		lockedUntil: account?.lockedUntil ?? "",
	}
}
