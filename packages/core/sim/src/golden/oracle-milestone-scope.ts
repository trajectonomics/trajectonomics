import type { Fixture } from "../fixtures/fixture"
import type { Flow } from "../types"
import type { OracleFires } from "./oracle-milestone-walk"

/**
 * Throws on any plan outside the oracle's scope: inflation and rates. With every rate at 0 the
 * liquid Accounts add up to one cash balance, so their number does not change the sum the oracle reads.
 */
export function assertScope(fixture: Fixture): void {
	if (fixture.scenario.economy.inflation !== 0)
		throw new Error("the oracle takes zero inflation only")
	if (fixture.scenario.accounts.some((account) => account.rate !== 0)) {
		throw new Error("the oracle takes rate 0 Accounts only")
	}
}

/** A `once` Flow whose `startAt` has not fired by its due date is one the engine would defer. */
export function assertLandsOnce(known: OracleFires, due: readonly Flow[]): void {
	for (const flow of due) {
		if (flow.frequency === "once" && flow.startAt !== undefined && !known.has(flow.startAt)) {
			throw new Error("the oracle does not defer a once Flow to its startAt fire date")
		}
	}
}
