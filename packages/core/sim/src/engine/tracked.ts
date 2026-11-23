import type { AccountId } from "../types"
import { addTo } from "./add"

/** The routing figures of a run that does not track the breakdown: one shared empty map, never filled. */
export const NO_ROUTING: ReadonlyMap<AccountId, bigint> = new Map()

/** Adds a positive amount to a tracked map; `undefined` is a run that does not track the breakdown. */
export function addTracked(
	map: Map<AccountId, bigint> | undefined,
	key: AccountId,
	amount: bigint,
): void {
	if (map !== undefined && amount > 0n) addTo(map, key, amount)
}
