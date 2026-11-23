/**
 * The shapes a real asset's items take in a document, and the readers that recognise them (cli ADR 0060). An
 * item whose id follows the convention but whose shape differs, such as one edited by hand in the terminal, is
 * not recognised: the page shows it as an ordinary item. Pure: data in, data out.
 */
import { z } from "zod"
import type { ScenarioFlow } from "../../contract/scenario-show"

/** The roundings of a computed amount, in the order the schema lists them. */
export const ROUNDINGS = ["floor", "halfUp", "ceil"] as const

/** The Measure that reads the asset's value, which every computed amount of an asset starts from. */
const valueMeasure = z.looseObject({
	id: z.literal("value"),
	op: z.literal("account"),
	account: z.string(),
})

/** The Measure that takes a share of the value: `num` over `den`, rounded as stated. */
const shareMeasure = z.looseObject({
	id: z.literal("share"),
	op: z.literal("scale"),
	of: z.literal("value"),
	num: z.number().int().min(0),
	den: z.number().int().min(1),
	rounding: z.enum(ROUNDINGS),
})

const shareDerive = z.looseObject({
	measures: z.tuple([valueMeasure, shareMeasure]),
	result: z.literal("share"),
})

const wholeDerive = z.looseObject({ measures: z.tuple([valueMeasure]), result: z.literal("value") })

/** The months in a year times the basis points in a unit: a monthly Flow's share of a yearly percent. */
export const MONTHLY_DEN = 120000
/** The basis points in a unit: a once Flow's share of a percent of the value. */
export const ONCE_DEN = 10000

/** A share of the value as the document states it: the integers and the rounding. */
export interface Share {
	readonly num: number
	readonly den: number
	readonly rounding: string
}

/** The share of the Account's value a Flow's derived amount takes, or null when it is not that shape. */
export function shareOf(flow: ScenarioFlow, account: string): Share | null {
	const parsed = shareDerive.safeParse(flow.derive)
	if (!parsed.success || parsed.data.measures[0].account !== account) return null
	const { num, den, rounding } = parsed.data.measures[1]
	return { num, den, rounding }
}

/** Whether a Flow's derived amount is the Account's whole value: what selling or repaying from it reads. */
export function readsWholeValue(flow: ScenarioFlow, account: string): boolean {
	const parsed = wholeDerive.safeParse(flow.derive)
	return parsed.success && parsed.data.measures[0].account === account
}

/** The derived amount that takes `num` over `den` of the Account's value, rounded as stated. */
export function shareDeriveOf(account: string, share: Share): Record<string, unknown> {
	return {
		measures: [
			{ id: "value", op: "account", account },
			{
				id: "share",
				op: "scale",
				of: "value",
				num: share.num,
				den: share.den,
				rounding: share.rounding,
			},
		],
		result: "share",
	}
}

/** The derived amount that reads the Account's whole value. */
export function wholeDeriveOf(account: string): Record<string, unknown> {
	return { measures: [{ id: "value", op: "account", account }], result: "value" }
}

/** Whether a Flow has a fixed amount: one that is neither derived nor a level payment. */
export function isFixed(flow: ScenarioFlow): boolean {
	return flow.amount !== undefined && flow.derive === undefined && flow.level === undefined
}
