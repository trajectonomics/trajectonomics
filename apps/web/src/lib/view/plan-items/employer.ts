/**
 * What an employer adds on top of a salary (sim ADR 0026, web ADR 0017): one Contribution Flow with `funding: "employer"`
 * and a `derive` that reads the salary's gross, under the id `<salary>-employer`. The Dashboard writes and reads that
 * shape and nothing else: a Flow that follows the id but not the shape is another item and is left as it is. The share is
 * moved to and from basis points by text, never by arithmetic, and no figure is computed.
 */

import { z } from "zod"
import type { ScenarioDocument, ScenarioFlow } from "../../contract/scenario-show"
import { formatBps } from "../../format/bps"
import { percentWords } from "../../format/percent"
import { ROUNDINGS } from "./asset-shape"

/** The basis points in a unit: the denominator a share typed as a percent is written over. */
export const SHARE_DEN = 10000

/** The id of the Flow that carries the employer's share of the salary with this id. */
export function employerIdOf(salaryId: string): string {
	return `${salaryId}-employer`
}

const payMeasure = z.looseObject({ id: z.literal("pay"), op: z.literal("flow"), flow: z.string() })
const shareMeasure = z.looseObject({
	id: z.literal("share"),
	op: z.literal("scale"),
	of: z.literal("pay"),
	num: z.number().int().min(0),
	den: z.literal(SHARE_DEN),
	rounding: z.enum(ROUNDINGS),
})
const employerDerive = z.looseObject({
	measures: z.tuple([payMeasure, shareMeasure]),
	result: z.literal("share"),
})

/** An employer's share as the document states it: the Flow, the Account it lands in, the percent and the rounding. */
export interface EmployerShare {
	readonly flow: ScenarioFlow
	readonly account: string
	/** The share as a percent with two places, such as "5.00", moved from the basis points by text. */
	readonly percent: string
	readonly rounding: string
}

/** The employer's share of the salary with this id, or null when the document holds none of the shape the form writes. */
export function employerOf(flows: readonly ScenarioFlow[], salaryId: string): EmployerShare | null {
	const flow = flows.find((one) => one.id === employerIdOf(salaryId))
	if (flow === undefined || flow.kind !== "contribution" || flow.funding !== "employer") return null
	if (flow.target === undefined) return null
	const parsed = employerDerive.safeParse(flow.derive)
	if (!parsed.success || parsed.data.measures[0].flow !== salaryId) return null
	const { num, rounding } = parsed.data.measures[1]
	return { flow, account: flow.target, percent: formatBps(num), rounding }
}

/** The sentence of a salary's card: "Employer adds 5% to Provident fund". */
export function employerWords(share: EmployerShare): string {
	return `Employer adds ${percentWords(share.percent)}% to ${share.account}`
}

/** The Accounts an employer's share may go to: assets that are not illiquid (a liability or a `liquid: false` asset is refused). */
export function employerTargets(doc: ScenarioDocument): string[] {
	return doc.accounts
		.filter((account) => account.kind === "asset" && account.liquid !== false)
		.map((account) => account.id)
}

/** The words of what an employer adds to an earned salary, from the Flows of the plan; null for any other Flow or when it adds none. */
export function employerText(
	all: readonly ScenarioFlow[],
	flow: ScenarioFlow,
	kind: "income" | "expense",
): string | null {
	if (kind !== "income" || flow.earned !== true) return null
	const share = employerOf(all, flow.id)
	return share === null ? null : employerWords(share)
}

/** What deleting a salary takes with it besides the salary: the employer's Flow it carries, or none when it has none of the form's shape. */
export function salaryDeleteNote(
	flows: readonly ScenarioFlow[],
	salaryId: string,
): string | undefined {
	return employerOf(flows, salaryId) === null
		? undefined
		: `Its employer share (${employerIdOf(salaryId)}) is deleted with it.`
}
