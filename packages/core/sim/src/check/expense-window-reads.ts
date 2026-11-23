import type { Emit, Path } from "./codes"
import { accountReadsOf, changedAccountOf } from "./flow-accounts"
import { isRecord } from "./shape"

const METRICS = ["metric", "base"] as const

function strings(value: unknown): readonly string[] {
	return Array.isArray(value) ? value.filter((item) => typeof item === "string") : []
}

/** The Accounts `cashflow.surplus`, `contribute` and `withdraw` can move. */
function cashflowAccounts(cashflow: unknown): readonly string[] {
	if (!isRecord(cashflow)) return []
	const steps: unknown[] = Array.isArray(cashflow["surplus"]) ? cashflow["surplus"] : []
	const surplus = steps.flatMap((step) =>
		isRecord(step) && typeof step["account"] === "string" ? [step["account"]] : [],
	)
	return [...surplus, ...strings(cashflow["contribute"]), ...strings(cashflow["withdraw"])]
}

/**
 * The Accounts that can change on a future date: the target of a Contribution (a debt payment, an
 * obligation purchase), the source of a withdrawal (a sale, a loan draw), and every Account the
 * cashflow's `surplus`, `contribute` or `withdraw` can move. Anything else holds its opening state
 * and grows by its rate alone.
 */
function changeable(scenario: Readonly<Record<string, unknown>>): ReadonlySet<string> {
	const flows: unknown[] = Array.isArray(scenario["flows"]) ? scenario["flows"] : []
	const ids = new Set(cashflowAccounts(scenario["cashflow"]))
	for (const flow of flows) {
		const id = changedAccountOf(flow)
		if (id !== undefined) ids.add(id)
	}
	return ids
}

/** Whether any Flow's Derived amount reads an Account in `moving`. */
function readsMoving(flows: unknown, moving: ReadonlySet<string>): boolean {
	if (!Array.isArray(flows)) return false
	return flows.some((flow, index) =>
		accountReadsOf(flow, ["scenario", "flows", index]).some((read) => moving.has(read.account)),
	)
}

/** Whether any Flow carries a Spending `rule`, whose amount depends on the years before it (ADR 0023). */
function hasRule(flows: unknown): boolean {
	return Array.isArray(flows) && flows.some((flow) => isRecord(flow) && Object.hasOwn(flow, "rule"))
}

/** Whether a Flow's amount cannot be priced over a year the run has not walked. */
function refusesWindow(scenario: Readonly<Record<string, unknown>>): boolean {
	const flows = scenario["flows"]
	return hasRule(flows) || readsMoving(flows, changeable(scenario))
}

/** Reports each `expenses: next12Months` Metric of one criterion, at the Metric's `expenses` key. */
function reportCriterion(criterion: unknown, at: Path, emit: Emit): void {
	if (!isRecord(criterion)) return
	for (const key of METRICS) {
		const metric = criterion[key]
		if (isRecord(metric) && metric["expenses"] === "next12Months") {
			emit("NEXT_12_MONTHS_READS_ACCOUNT", [...at, key, "expenses"])
		}
	}
}

/**
 * A Milestone's `next12Months` expense window plans each Flow's amounts over a year it has not
 * walked. A Derived amount that reads an Account that nothing changes is priced from that Account's
 * state as it stands, grown to each date. One that reads an Account that can change on a future
 * date would need a forward walk, so the two do not meet in one Scenario (ADR 0020). A rule Flow
 * never meets one: its amount carries last year's, which a window that has not walked cannot know.
 */
export function checkExpenseWindowReads(scenario: unknown, emit: Emit): void {
	if (!isRecord(scenario) || !refusesWindow(scenario)) return
	const milestones = scenario["milestones"]
	if (!Array.isArray(milestones)) return
	for (let index = 0; index < milestones.length; index++) {
		const milestone: unknown = milestones[index]
		const criteria = isRecord(milestone) ? milestone["criteria"] : undefined
		if (!Array.isArray(criteria)) continue
		for (let position = 0; position < criteria.length; position++) {
			reportCriterion(
				criteria[position],
				["scenario", "milestones", index, "criteria", position],
				emit,
			)
		}
	}
}
