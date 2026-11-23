import type { LiabilityRow } from "./projection/liabilities-view"
import type { ProjectionRunView } from "./projection/run-view"
import { projectionHome } from "./projection/testing"
import { CAR_LOAN, LOAN_SCENARIO, ZERO_LOAN_SCENARIO } from "./projection-liabilities-plan"
import { tableOf } from "./projection-run-support"
import { applyScenario } from "./scenario-test-support"

/*
 * The fixtures and readers the `projection run --liabilities` tests share (cli ADR-0059).
 */

export { CAR_LOAN }

/** The fixture home with the car loan (6%) and the zero-rate loan stored as Scenarios. */
export async function loanHome(): Promise<string> {
	const home = await projectionHome()
	for (const [name, plan] of [
		["car-loan", LOAN_SCENARIO],
		["car-zero", ZERO_LOAN_SCENARIO],
	] as const) {
		const applied = await applyScenario(home, name, plan)
		if (applied.code !== 0) throw new Error(applied.err)
	}
	return home
}

/** A money decimal string as integer minor units of a two-place Currency: "-1200.00" is -120000. */
export function minor(text: string): number {
	return Number(text.replace(".", ""))
}

/** The statement rows of one liability, in date order. */
export function monthsOf(body: ProjectionRunView, account: string): LiabilityRow[] {
	return tableOf(body, "liabilities").rows.filter((row) => row.account === account)
}

/** The month that starts on a given day. */
export function monthStarting(
	body: ProjectionRunView,
	account: string,
	from: string,
): LiabilityRow {
	const row = monthsOf(body, account).find((entry) => entry.from === from)
	if (row === undefined) throw new Error(`no ${account} month starts on ${from}`)
	return row
}

/** The paid-off date of one liability, or null when it is not paid off by the end. */
export function paidOffOf(body: ProjectionRunView, account: string): string | null {
	const row = tableOf(body, "paidOff").rows.find((entry) => entry.account === account)
	if (row === undefined) throw new Error(`no paid-off row for ${account}`)
	return row.date
}
