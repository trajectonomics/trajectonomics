import type { ResolvedCalendar } from "../calendar/business"
import { payoutOccurrences } from "../calendar/payout"
import type { DatedEvent } from "../engine/events"
import type {
	AccountId,
	AssetRule,
	DateString,
	Fee,
	Flow,
	IncomeFlow,
	Scenario,
	Timeline,
} from "../types"

/**
 * The marker an Account's fee leaves on each month end (ADR 0028): an income Flow of 0 that carries the
 * Account and the fee, so every walk of the events, the Milestone gate, the FI scan and each Market path
 * reaches the date. It lands nothing and lives in no Scenario's `flows`; only this module makes one.
 */
export type FeeMark = IncomeFlow & {
	readonly amount: 0
	readonly feeOf: { readonly account: AccountId } & Fee
}

export function isFee(flow: Flow): flow is FeeMark {
	return "feeOf" in flow
}

/** The asset Accounts that charge a fee above 0 bps, in Scenario order. A fee of 0 is none. */
export function chargingAccounts(scenario: Scenario): readonly AssetRule[] {
	return scenario.accounts.filter(
		(account): account is AssetRule =>
			account.kind === "asset" && account.fee !== undefined && account.fee.bps > 0,
	)
}

/** Whether the Scenario's Accounts charge a fee, so its Projection reports fees. */
export function declaresFees(scenario: Scenario): boolean {
	return chargingAccounts(scenario).length > 0
}

function markOf(account: AssetRule): FeeMark {
	const { bps, rounding } = account.fee!
	return {
		id: `fee:${account.id}`,
		kind: "income",
		earned: false,
		frequency: "monthly",
		start: "0001-01-01",
		amount: 0,
		growth: { bps: 0 },
		feeOf: { account: account.id, bps, rounding },
	}
}

/**
 * One marker event per charging Account on each calendar month end in the timeline, on its Landed date
 * like a Compounding date (the Calendar shifts a Saturday month end to the Monday).
 */
export function feeEvents(
	scenario: Scenario,
	timeline: Timeline,
	calendar: ResolvedCalendar | undefined,
): readonly DatedEvent[] {
	const accounts = chargingAccounts(scenario)
	if (accounts.length === 0) return []
	const dates: readonly DateString[] = payoutOccurrences(
		"0001-01-01",
		"monthly",
		undefined,
		timeline.start,
		timeline.horizon,
		calendar,
	).map((occurrence) => occurrence.date)
	return accounts.flatMap((account) => {
		const flow = markOf(account)
		return dates.map((date): DatedEvent => ({ date, flow, years: 0, amount: 0n }))
	})
}
