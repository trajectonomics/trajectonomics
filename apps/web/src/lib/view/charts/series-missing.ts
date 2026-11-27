import type { AccountNames } from "../account-names"
import { apart } from "./series-apart"
import { seriesWords } from "./series-ids"

/**
 * The names of the series a plan does not state, built from their ids and then told apart exactly as the drawn
 * names are: a tie takes its group, item, category and Account, then " (2)", " (3)" in sorted-id order (web ADR
 * 0029). No two lines of a "Not in this Snapshot" or "Not on this plan" list ever read alike.
 */
export function missingNames(
	ids: readonly string[],
	names: ReadonlyMap<string, string> = new Map(),
	accounts: AccountNames = new Map(),
): ReadonlyMap<string, string> {
	const items = ids.map((id) => ({ id, name: names.get(id) ?? seriesWords(id, accounts) }))
	const fixed = new Set(ids.filter((id) => names.has(id)))
	return new Map(apart(items, fixed, accounts).map((item) => [item.id, item.name]))
}
