import type { ErrorCode, Path } from "../check/codes"
import { flowRefsOf } from "../levy/refs"
import type { Flow, Scenario } from "../types"
import { isDerived } from "../types"
import type { InputProblem } from "../types/projection"

function indexFlows(flows: readonly Flow[]): ReadonlyMap<string, number> {
	const index = new Map<string, number>()
	for (let position = 0; position < flows.length; position++) {
		const flow = flows[position]
		if (flow !== undefined && !index.has(flow.id)) index.set(flow.id, position)
	}
	return index
}

function flowAt(
	flows: readonly Flow[],
	index: ReadonlyMap<string, number>,
	id: string,
): Flow | undefined {
	const position = index.get(id)
	return position === undefined ? undefined : flows[position]
}

/** Whether a Flow reads earned income, directly or through a chain of Derived amounts. */
function readsEarned(
	flows: readonly Flow[],
	index: ReadonlyMap<string, number>,
	start: string,
): boolean {
	const seen = new Set<string>()
	const stack = [start]
	while (stack.length > 0) {
		const id = stack.pop()!
		if (seen.has(id)) continue
		seen.add(id)
		const flow = flowAt(flows, index, id)
		if (flow === undefined) continue
		if (flow.kind === "income" && flow.earned) return true
		if (isDerived(flow)) stack.push(...flowRefsOf(flow.derive))
	}
	return false
}

/** The first Derived Flow that `offends` and reads earned income, as a problem with `code`. */
function firstReadingEarned(
	scenario: Scenario,
	offends: (flow: Flow) => boolean,
	code: ErrorCode,
): InputProblem | undefined {
	const index = indexFlows(scenario.flows)
	for (let position = 0; position < scenario.flows.length; position++) {
		const flow = scenario.flows[position]
		if (flow === undefined || !isDerived(flow) || !offends(flow)) continue
		if (readsEarned(scenario.flows, index, flow.id)) {
			const path: Path = ["scenario", "flows", position, "derive"]
			return { code, path }
		}
	}
	return undefined
}

/**
 * A Derived expense that reads earned income, transitively: earned income stops in an FI
 * candidate, so the expense would fall to 0 and make the answer too early. The FI entry rejects
 * it unless `retirementSpending` replaces every expense after the FI month.
 */
export function derivedExpenseProblem(scenario: Scenario): InputProblem | undefined {
	return firstReadingEarned(
		scenario,
		(flow) => flow.kind === "expense",
		"DERIVED_EXPENSE_READS_EARNED",
	)
}

/**
 * A Derived contribution into a liability that reads earned income, transitively: a debt payment
 * is an obligation, so zeroing it after the FI month would stop paying the debt. No option waives
 * it, because `retirementSpending` replaces expenses only.
 */
export function derivedDebtPaymentProblem(scenario: Scenario): InputProblem | undefined {
	const liabilities = new Set(
		scenario.accounts
			.filter((account) => account.kind === "liability")
			.map((account) => account.id),
	)
	return firstReadingEarned(
		scenario,
		(flow) => flow.kind === "contribution" && liabilities.has(flow.target),
		"DERIVED_DEBT_PAYMENT_READS_EARNED",
	)
}
