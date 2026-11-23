/** What a run records beyond its snapshots and totals; each is off unless asked for. */
export interface RunOptions {
	/** Track each liability's paid-off date. */
	readonly tracked?: boolean
	/** Keep the cash-flow breakdown rows. */
	readonly breakdown?: boolean
	/** Log each rule Occurrence's date and planned amount in the rule book (chance of success). */
	readonly recordRules?: boolean
}
