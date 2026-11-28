import { BEGINNABLE_BLOCKS } from "./set-begin"

/*
 * The keys a `--set` may add to an item that leaves them out (cli ADR-0065, amended by ADR-0068 and
 * ADR-0070). Each rule is named where a refusal lists the paths a Set may begin, so a hint's command
 * and the refusal can never disagree.
 */

/**
 * The one key of an item a `--set` may add when the item leaves it out (cli ADR-0068): an asset
 * Account's `volatility`, which no plan states by default. A liability has no volatility (the engine
 * refuses it), and every other absent key is still `No key or id`.
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

/** The keys a `--set` may add to a Flow or a Milestone: its display label, which a plan may leave out (sim ADR 0032). */
export function beginsDisplayLabel(segment: string, prefix: readonly string[]): boolean {
	return (
		segment === "displayLabel" &&
		prefix.length === 2 &&
		(prefix[0] === "flows" || prefix[0] === "milestones")
	)
}

/**
 * A Flow's Tally label, which an income or contribution Flow may leave out and which the Assumed
 * values' hint states with `--set` (cli ADR-0083). The engine accepts the key with no label; the tax
 * write still judges which labels it reads.
 */
export function beginsFlowLabel(
	node: Record<string, unknown>,
	segment: string,
	prefix: readonly string[],
): boolean {
	return (
		segment === "label" &&
		prefix.length === 2 &&
		prefix[0] === "flows" &&
		(node["kind"] === "income" || node["kind"] === "contribution")
	)
}

/** The keys a `--set` may add to a surplus step, where the step leaves them out (cli ADR-0070). */
const STEP_KEYS: readonly string[] = ["share", "upTo"]

/** The keys a `--set` may begin on a routing entry (cli ADR-0070): a surplus step's `share` or `upTo`. */
export function beginsSurplusKey(segment: string, prefix: readonly string[]): boolean {
	return (
		prefix.length === 3 &&
		prefix[0] === "cashflow" &&
		prefix[1] === "surplus" &&
		STEP_KEYS.includes(segment)
	)
}

/**
 * The inflation spread a `--set` may add when `economy` leaves it out (cli ADR-0085, amending ADR-0065):
 * `--set economy.inflationVolatility=150` gives the chance of success a swing without a volatile Account.
 */
export function beginsInflationVolatility(segment: string, prefix: readonly string[]): boolean {
	return segment === "inflationVolatility" && prefix.length === 1 && prefix[0] === "economy"
}

/** The keys a `--set` may add to an item that leaves them out: an Account's volatility, the inflation spread, a label, a surplus step's share or cap. */
export function beginsKey(
	node: Record<string, unknown>,
	segment: string,
	prefix: readonly string[],
): boolean {
	return (
		beginsAccountVolatility(node, segment, prefix) ||
		beginsInflationVolatility(segment, prefix) ||
		beginsDisplayLabel(segment, prefix) ||
		beginsFlowLabel(node, segment, prefix) ||
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
 * a Flow's label, a surplus step's `share` and `upTo`.
 */
export function beginnableKeysAt(
	node: Record<string, unknown>,
	prefix: readonly string[],
): readonly string[] {
	const keys = [...(prefix.length === 0 ? BEGINNABLE_BLOCKS : [])]
	for (const key of ["volatility", "inflationVolatility", "displayLabel", "label", ...STEP_KEYS]) {
		if (beginsKey(node, key, prefix)) keys.push(key)
	}
	return keys.filter((key) => !Object.hasOwn(node, key))
}
