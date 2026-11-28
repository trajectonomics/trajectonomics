import type { AppError } from "../errors"
import type { SegmentContext } from "./set-error"
import { flagError, type OverrideFlag } from "./set-parse"

/**
 * The optional top-level blocks of a Scenario that a `--set` may begin when the document leaves them
 * out (cli ADR-0065): `--set estate=<json>` writes the whole block where there was none. Only a block
 * is on the list, never a list of items (`--add` begins those, ADR-0062) and never a key a plan must
 * state. The Dashboard needs `estate`, so that is the one block today; a block joins this list in the
 * pull request that needs it, and `set-begin.test.ts` fails when a name here is not an optional object
 * the published schema declares.
 */
export const BEGINNABLE_BLOCKS: readonly string[] = ["estate"]

export function isBeginnableBlock(segment: string): boolean {
	return BEGINNABLE_BLOCKS.includes(segment)
}

/** `--set estate.costs=…` on a document with no `estate`: the block is begun whole, never by a part. */
export function unbegunBlock(segment: string, ctx: SegmentContext): AppError {
	const flag: OverrideFlag = ctx.flag ?? "set"
	return flagError(
		flag,
		ctx.index,
		`the document has no "${segment}" block yet, so "${ctx.path}" has nothing to change`,
		{
			hint: `Begin the block whole with --set ${segment}=<json>, such as --set '${segment}={"costs":[...]}'; a later --set can then change a part of it.`,
			details: { index: ctx.index, path: ctx.path, segment, suggestion: null },
		},
	)
}

/**
 * The inflation spread a `--set` may add when `economy` leaves it out (cli ADR-0085, amending ADR-0065):
 * `--set economy.inflationVolatility=150` is the what-if that gives the chance of success its first
 * swing without a volatile Account.
 */
export function beginsInflationVolatility(segment: string, prefix: readonly string[]): boolean {
	return segment === "inflationVolatility" && prefix.length === 1 && prefix[0] === "economy"
}

/**
 * The one key of an item a `--set` may add when the item leaves it out (cli ADR-0068, amending ADR-0065):
 * an asset Account's `volatility`, which no plan states by default, so `--set accounts.<id>.volatility=1500`
 * is the what-if that gives the chance of success its first swing. A liability has no volatility (the
 * engine refuses it), and every other absent key is still `No key or id`.
 */
export function beginsAccountVolatility(
	node: Record<string, unknown>,
	segment: string,
	prefix: readonly string[],
): boolean {
	return (
		segment === "volatility" &&
		prefix.length === 2 &&
		prefix[0] === "accounts" &&
		node["kind"] === "asset"
	)
}

/** The keys a `--set` may add to a surplus step, where the step leaves them out (cli ADR-0070). */
const STEP_KEYS: readonly string[] = ["share", "upTo"]

/**
 * The keys a `--set` may begin on a routing entry (cli ADR-0070, as ADR-0068 did for volatility): a surplus
 * step's `share` or `upTo`, which a plan with no share or cap leaves out, so `--set cashflow.surplus.0.share=3000`
 * is the what-if that gives the step its first one.
 */
export function beginsSurplusKey(segment: string, prefix: readonly string[]): boolean {
	return (
		prefix.length === 3 &&
		prefix[0] === "cashflow" &&
		prefix[1] === "surplus" &&
		STEP_KEYS.includes(segment)
	)
}

/** The keys a `--set` may add to a Flow or a Milestone: its display label, which a plan may leave out (sim ADR 0032). */
export function beginsDisplayLabel(segment: string, prefix: readonly string[]): boolean {
	return (
		segment === "displayLabel" &&
		prefix.length === 2 &&
		(prefix[0] === "flows" || prefix[0] === "milestones")
	)
}

/** The keys a `--set` may add to an item that leaves them out: an Account's or the economy's volatility, a display label, a surplus step's share or cap. */
export function beginsKey(
	node: Record<string, unknown>,
	segment: string,
	prefix: readonly string[],
): boolean {
	return (
		beginsAccountVolatility(node, segment, prefix) ||
		beginsInflationVolatility(segment, prefix) ||
		beginsDisplayLabel(segment, prefix) ||
		beginsSurplusKey(segment, prefix)
	)
}

/**
 * A withdraw entry that is a bare id becomes `{ account, downTo }` when a `--set` gives it a floor:
 * `--set cashflow.withdraw.0.downTo=300000` is "what if I kept 300,000 in the first Account before
 * touching the rest" (cli ADR-0070). Only `downTo` begins an entry, and only as the whole path's end.
 */
export function beginsWithdrawFloor(
	entry: unknown,
	segment: string,
	prefix: readonly string[],
): entry is string {
	return (
		typeof entry === "string" &&
		segment === "downTo" &&
		prefix.length === 3 &&
		prefix[0] === "cashflow" &&
		prefix[1] === "withdraw"
	)
}

/**
 * The keys a `--set` may begin on the object at `prefix`, so a refusal that lists the keys there names them
 * too: the estate block at the root, an asset Account's `volatility`, the economy's `inflationVolatility`,
 * a display label, a surplus step's `share` and `upTo`.
 */
export function beginnableKeysAt(
	node: Record<string, unknown>,
	prefix: readonly string[],
): readonly string[] {
	const keys = [...(prefix.length === 0 ? BEGINNABLE_BLOCKS : [])]
	for (const key of ["volatility", "inflationVolatility", "displayLabel", ...STEP_KEYS]) {
		if (beginsKey(node, key, prefix)) keys.push(key)
	}
	return keys.filter((key) => !Object.hasOwn(node, key))
}
