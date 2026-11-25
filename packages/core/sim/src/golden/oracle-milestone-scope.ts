import type { Fixture } from "../fixtures/fixture"
import type { Flow, Scenario } from "../types"
import { oracleMarkedIds } from "./oracle-access"
import type { OracleFires } from "./oracle-milestone-walk"

function assertAccounts(accounts: Scenario["accounts"]): void {
	for (const account of accounts) {
		if (account.rate !== 0) throw new Error("the oracle takes rate 0 Accounts only")
		if (account.kind === "liability") throw new Error("the oracle takes asset Accounts only")
		if (account.lockedUntil !== undefined || account.fee || account.payout) {
			throw new Error("the oracle takes Accounts with no lock, fee or payout only")
		}
	}
}

/** The one Account the plan draws on and fills; throws on a floor, a cap or a second Account. */
function routedAccount(cashflow: Scenario["cashflow"]): string {
	if (cashflow.withdraw.some((entry) => typeof entry !== "string")) {
		throw new Error("the oracle takes withdrawals with no downTo floor only")
	}
	if (cashflow.surplus.some((step) => step.upTo !== undefined || step.share !== undefined)) {
		throw new Error("the oracle takes surplus steps with no upTo or share only")
	}
	const routed = new Set([
		...cashflow.withdraw.map((entry) => (typeof entry === "string" ? entry : entry.account)),
		...cashflow.surplus.map((step) => step.account),
	])
	const [cash] = routed
	if (routed.size !== 1 || cash === undefined) {
		throw new Error("the oracle takes exactly one withdraw and surplus Account")
	}
	return cash
}

/** The oracle lands income and expense Flows only: a transfer moves cash it does not model. */
function assertFlows(scenario: Scenario): void {
	for (const flow of scenario.flows) {
		if (flow.kind !== "income" && flow.kind !== "expense") {
			throw new Error("the oracle takes income and expense Flows only")
		}
		if (flow.kind === "income" && (flow.prepayments?.length || flow.cappedPrepayment)) {
			throw new Error("the oracle takes income Flows with no prepayment only")
		}
	}
	if (scenario.levies?.length) throw new Error("the oracle takes plans with no Levy only")
}

/**
 * Throws on any plan outside the oracle's scope: inflation, rates, a liability, a lock, a fee, a
 * payout, a Reserve floor, a Flow that is neither income nor expense, a prepayment, a Levy, or
 * routing that names more than one Account. Returns the one Account the
 * plan draws on and fills, the cash survival reads. Every other Account is idle at rate 0.
 */
export function assertScope(fixture: Fixture): string {
	const { economy, accounts, cashflow } = fixture.scenario
	if (economy.inflation !== 0) throw new Error("the oracle takes zero inflation only")
	assertAccounts(accounts)
	assertFlows(fixture.scenario)
	return routedAccount(cashflow)
}

/** The opening balances in three parts: the cash survival reads, the idle ones, the marked ones. */
export function openingBalances(
	fixture: Fixture,
	cashId: string,
): { cash: number; idle: number; marked: number } {
	const marked = oracleMarkedIds(fixture.scenario.accounts)
	const split = { cash: 0, idle: 0, marked: 0 }
	for (const { account, amount } of fixture.baseline.balances) {
		if (account === cashId) split.cash += amount
		else if (marked.has(account)) split.marked += amount
		else split.idle += amount
	}
	return split
}

/**
 * A `once` Flow whose `startAt` has not fired by its due date is one the engine would defer. The
 * fire date must be known and no later than `day`: a static Milestone's date is known from the start,
 * so being known is not enough.
 */
export function assertLandsOnce(known: OracleFires, due: readonly Flow[], day: string): void {
	for (const flow of due) {
		if (flow.frequency !== "once" || flow.startAt === undefined) continue
		const fire = known.get(flow.startAt)
		if (fire === undefined || fire > day) {
			throw new Error("the oracle does not defer a once Flow to its startAt fire date")
		}
	}
}
