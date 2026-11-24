import type { Account, AccountId, Baseline, DateString, Scenario } from "../types"
import { compareIds } from "./order"
import type { ResolvedReturns, ResolvedSeries } from "./returns"
import type { Walked } from "./span"

/**
 * Growth already attributed to Settlement periods since the Account's last commit. The base is
 * `AccountState.balance`, measured at `AccountState.asOf`; a commit resets both.
 */
export interface ReturnLedger {
	readonly label: string
	/** The Account's value right after its last commit, or at `start`. */
	base: bigint
	/** The Timeline start, before which nothing is attributed. */
	readonly since: DateString
	/** Growth from `base` already given to each Levy's earlier Settlement periods. */
	readonly attributed: Map<string, bigint>
	/** The last date each Levy's attribution reached: a commit date after a reset, else a boundary. */
	readonly through: Map<string, DateString>
}

/** The last read of an effective Account's growth: valid only for the same balance, `asOf` and date. */
export interface GrownValue {
	readonly balance: bigint
	readonly asOf: DateString
	readonly date: DateString
	readonly amount: bigint
	/** The part of `amount` still to earn in the row `date` falls in; only an Account on a Return series reads it. */
	readonly earning: bigint
}

export interface AccountState {
	readonly rule: Account
	readonly series?: ResolvedSeries
	/** An effective Account's value, or a nominal Account's capitalised balance. */
	balance: bigint
	asOf: DateString
	/** The Timeline start the run opened on: a routed target keeps its value in today's money from here (ADR 0030). */
	readonly opened: DateString
	/**
	 * An Account on a Return series: the part of `balance` still to earn in the row `asOf` falls in.
	 * Absent, all of it. A change mid-row moves it by the change, so it adds no `r²` term (ADR 0005).
	 */
	earning?: bigint
	/** A nominal Account's exact capitalised-days numerator; always 0 for an effective Account. */
	capitalisedDays: bigint
	/** The last grown value read, so the Milestones and the engine share one reading of a date. */
	grown?: GrownValue | undefined
	/** An Account on a Return series: its value after the last whole row a read passed. */
	walked?: Walked
	/** Present only for an asset Account with `returnLabel`. */
	readonly returns?: ReturnLedger
	/** Pooled Cost basis, present only for an asset Account with `gainLabel`. */
	basis?: bigint
}

export type StateMap = ReadonlyMap<AccountId, AccountState>

function ledgerOf(rule: Account, amount: number, start: DateString): ReturnLedger | undefined {
	if (rule.kind !== "asset" || rule.returnLabel === undefined) return undefined
	return {
		label: rule.returnLabel,
		base: BigInt(amount),
		since: start,
		attributed: new Map(),
		through: new Map(),
	}
}

function basisOf(rule: Account, opening: ReadonlyMap<AccountId, number>): bigint | undefined {
	if (rule.kind !== "asset" || rule.gainLabel === undefined) return undefined
	return BigInt(opening.get(rule.id) ?? 0)
}

interface Opened {
	readonly rule: Account
	readonly amount: number
	readonly start: DateString
	readonly series: ResolvedSeries | undefined
	readonly basis: ReadonlyMap<AccountId, number>
}

function stateOf(opened: Opened): AccountState {
	const { rule, amount, start, series, basis } = opened
	const returns = ledgerOf(rule, amount, start)
	const cost = basisOf(rule, basis)
	return {
		rule,
		balance: BigInt(amount),
		asOf: start,
		opened: start,
		capitalisedDays: 0n,
		...(series === undefined ? {} : { series }),
		...(returns === undefined ? {} : { returns }),
		...(cost === undefined ? {} : { basis: cost }),
	}
}

/** Every declared account gets a state; missing baseline balances open at zero. */
export function createStates(
	baseline: Baseline,
	scenario: Scenario,
	start: DateString,
	series?: ResolvedReturns,
): StateMap {
	const opening = new Map<AccountId, number>()
	const basis = new Map<AccountId, number>()
	for (const balance of baseline.balances) {
		opening.set(balance.account, balance.amount)
		if (balance.basis !== undefined) basis.set(balance.account, balance.basis)
	}
	const states = new Map<AccountId, AccountState>()
	const rules = [...scenario.accounts].sort((a, b) => compareIds(a.id, b.id))
	for (const rule of rules) {
		states.set(
			rule.id,
			stateOf({
				rule,
				amount: opening.get(rule.id) ?? 0,
				start,
				series: series?.get(rule.id),
				basis,
			}),
		)
	}
	return states
}
