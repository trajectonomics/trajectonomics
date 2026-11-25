import type { Baseline, ProjectionRun, Read, ScenarioAccount } from "../../contract"
import { formatBps } from "../../format/bps"
import { percentWords } from "../../format/percent"
import { type ItemNames, NO_ITEM_NAMES } from "../item-names"
import {
	type FeeDraft,
	feeDraftOf,
	type IncomeContext,
	NO_INCOME_CONTEXT,
	type PayoutDraft,
	payoutDraftOf,
} from "./account-income"
import { payoutHowWords, payoutWords } from "./account-words"
import { type AccountYear, accountLifetimesOf, accountYears } from "./account-years"

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
	/** "Pays out 3.5% a year from retire", from the stored payout; null when the Account pays none out. */
	readonly payout: string | null
	/** How it is paid: "Paid quarterly", with the kind of income when a tax label says it; null with no payout. */
	readonly payoutHow: string | null
	/** "Fee 1.5% a year"; null when the Account charges none. */
	readonly fee: string | null
	/** What `projection run` states for the Account by roll-up: its payouts and its fees. Empty when it states none. */
	readonly years: readonly AccountYear[]
	/** What the Account was charged over the whole plan, as `projection run` states it ("Fees over the plan"); null when it states none. */
	readonly lifetimeFees: string | null
	/** What the Account paid out over the whole plan, as `projection run` states it ("Paid out over the plan"); null when it states none. */
	readonly lifetimePayouts: string | null
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
	run?: ProjectionRun,
	names: ItemNames = NO_ITEM_NAMES,
): AccountCard[] {
	return accounts.map((account) => {
		const lifetimes = accountLifetimesOf(run, account.id)
		return {
			id: account.id,
			kind: account.kind,
			rate: `${formatBps(account.rate)}%`,
			compounding: account.compounding ?? null,
			lockedUntil: account.lockedUntil ?? null,
			balance: balanceOf(account, baseline),
			payout: payoutWords(account, names),
			payoutHow: payoutHowWords(account),
			fee: account.fee === undefined ? null : `Fee ${percentWords(account.fee.bps)}% a year`,
			years:
				account.payout === undefined && account.fee === undefined
					? []
					: accountYears(run, account.id),
			lifetimeFees: lifetimes.fees,
			lifetimePayouts: lifetimes.payouts,
		}
	})
}

/** The form's text for one Account. A new Account is an asset, with no compounding and no lock. */
export interface AccountDraft {
	readonly name: string
	/** "asset" or "liability", as text so a form can bind it; the schema refuses any other value. */
	readonly kind: string
	readonly rate: string
	readonly compounding: string
	readonly lockedUntil: string
	/** What the Account pays out and what it is charged: sections of the form for an asset that is not illiquid. */
	readonly payout: PayoutDraft
	readonly fee: FeeDraft
}

/** The draft of an Account to edit, or of a new one when there is no Account. */
export function accountDraftOf(
	account?: ScenarioAccount,
	income: IncomeContext = NO_INCOME_CONTEXT,
): AccountDraft {
	return {
		name: account?.id ?? "",
		kind: account?.kind ?? "asset",
		rate: account === undefined ? "" : formatBps(account.rate),
		compounding: account?.compounding ?? "",
		lockedUntil: account?.lockedUntil ?? "",
		payout: payoutDraftOf(account?.payout, income),
		fee: feeDraftOf(account?.fee),
	}
}
