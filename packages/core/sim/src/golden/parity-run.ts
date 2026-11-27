/** A chance run over the Return model `planReturnModel` builds from a Scenario (ADR 0029). */
export interface ParityPlan {
	readonly buckets: number
	readonly seed: string
	readonly paths: number
}

/** A per-path replay of the model `planReturnModel` builds, at `index` of the run (ADR 0033). */
export interface ParityPath extends ParityPlan {
	readonly index: number
}
