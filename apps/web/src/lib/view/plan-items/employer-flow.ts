/** The employer's Flow of a salary, as the form writes it (web ADR 0017). */
import { type ScenarioFlow, scenarioFlow } from "../../contract/scenario-show"
import { employerIdOf, SHARE_DEN } from "./employer"

/** What a form states for the share: the Account, the basis points of the percent typed, and the rounding. */
export interface EmployerInput {
	readonly account: string
	readonly bps: number
	readonly rounding: string
}

/** The fields of a salary the employer's Flow takes as its own: when it lands and when it stops. */
const SALARY_DATES = ["frequency", "start", "end", "startAt", "endAt"] as const

/**
 * The employer's Flow for a salary: a Contribution into the Account whose amount is the share of the salary's gross, with the
 * salary's own frequency, start, end and Milestone gates, so it lands when the salary does and stops when it stops. Fields
 * the form does not state (such as a label added by hand) are kept from the Flow it replaces.
 */
export function employerFlowOf(
	salary: ScenarioFlow,
	input: EmployerInput,
	old: ScenarioFlow | null,
): ScenarioFlow | null {
	const dates = Object.fromEntries(
		SALARY_DATES.flatMap((key) => (key in salary ? [[key, salary[key]]] : [])),
	)
	const kept = Object.fromEntries(
		Object.entries(old ?? {}).filter(
			([key]) =>
				![...SALARY_DATES, "amount", "growth", "derive", "target", "funding"].includes(key),
		),
	)
	const parsed = scenarioFlow.safeParse({
		...kept,
		id: employerIdOf(salary.id),
		kind: "contribution",
		target: input.account,
		funding: "employer",
		...dates,
		derive: {
			measures: [
				{ id: "pay", op: "flow", flow: salary.id },
				{
					id: "share",
					op: "scale",
					of: "pay",
					num: input.bps,
					den: SHARE_DEN,
					rounding: input.rounding,
				},
			],
			result: "share",
		},
	})
	return parsed.success ? parsed.data : null
}
