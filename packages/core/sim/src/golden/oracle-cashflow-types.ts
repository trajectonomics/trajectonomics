export interface OracleTotals {
	/** Planned amount per income, expense and withdrawal Flow id. */
	readonly planned: Map<string, bigint>
	/** Applied amount per contribution Flow id: a debt payment or an asset grant. */
	readonly applied: Map<string, bigint>
	/** Unfunded amount per asset contribution Flow id. */
	readonly unfunded: Map<string, bigint>
	/** Landed amount per employer Contribution Flow id: outside cashflow, so not in `applied`. */
	readonly employer: Map<string, bigint>
	readonly prepaid: Map<string, bigint>
	readonly drawn: Map<string, bigint>
	readonly surplus: Map<string, bigint>
	unmet: bigint
}

export function add(map: Map<string, bigint>, key: string, amount: bigint): void {
	map.set(key, (map.get(key) ?? 0n) + amount)
}

export function min(left: bigint, right: bigint): bigint {
	return left < right ? left : right
}
