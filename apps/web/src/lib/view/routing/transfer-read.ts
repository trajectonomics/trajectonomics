/**
 * What a transfer Flow moves, read back from the document (sim ADR 0031): a fixed amount, all of the source, or a share of
 * what the source holds. The share is the Flow the page writes: a `scale` of the source's value over 10,000. A Flow whose
 * `derive` has another shape is another item: it is shown as computed and left as it is.
 */
import { z } from "zod"
import type { ScenarioFlow } from "../../contract"
import { formatBps, percentWords } from "../../format"
import { SHARE_DEN } from "../plan-items/employer"

export type Moves = DerivedMoves | { how: "amount" }

/** How a `derive` moves money: all of the source, a share of it, or null when the shape is another. */
export type DerivedMoves = { how: "all" } | { how: "share"; share: string } | null

const held = z.looseObject({ id: z.string(), op: z.literal("account"), account: z.string() })
const scale = z.looseObject({
	id: z.string(),
	op: z.literal("scale"),
	of: z.string(),
	num: z.number().int().min(0),
	den: z.literal(SHARE_DEN),
})
const all = z.looseObject({ measures: z.tuple([held]), result: z.string() })
const part = z.looseObject({ measures: z.tuple([held, scale]), result: z.string() })

/** How a derive moves money, or null when it is a shape the page does not write. */
export function movesFrom(derive: unknown): DerivedMoves {
	const one = all.safeParse(derive)
	if (one.success && one.data.result === one.data.measures[0].id) return { how: "all" }
	const two = part.safeParse(derive)
	if (!two.success) return null
	const [source, share] = two.data.measures
	const reads = share.of === source.id && two.data.result === share.id
	return reads ? { how: "share", share: formatBps(share.num) } : null
}

/** What a transfer's `derive` says in words, as its card reads it: "all of the source", or "10% of the source". */
export function moveWords(derive: unknown): string | null {
	const moves = movesFrom(derive)
	if (moves === null) return null
	return moves.how === "all" ? "all of the source" : `${percentWords(moves.share)}% of the source`
}

/** How much a transfer moves, or null when its amount is a shape the page does not write. */
export function movesOf(flow: ScenarioFlow): Moves {
	if (flow.derive === undefined) return flow.amount === undefined ? null : { how: "amount" }
	return movesFrom(flow.derive)
}

/** The derive of "all of the source". */
export function allOf(source: string): Record<string, unknown> {
	return { measures: [{ id: "held", op: "account", account: source }], result: "held" }
}

/** The derive of a share of the source, `bps` basis points, rounded down as the engine's own share step is. */
export function shareOf(source: string, bps: number): Record<string, unknown> {
	return {
		measures: [
			{ id: "held", op: "account", account: source },
			{ id: "part", op: "scale", of: "held", num: bps, den: SHARE_DEN, rounding: "floor" },
		],
		result: "part",
	}
}
