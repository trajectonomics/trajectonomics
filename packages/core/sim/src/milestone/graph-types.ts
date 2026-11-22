/** One criterion as the Milestone graph sees it: a date, a reference to another Milestone, or other. */
export type GraphCriterion =
	| { readonly kind: "date" }
	| { readonly kind: "milestone"; readonly to: string; readonly months: number }
	| { readonly kind: "other" }

export interface GraphNode {
	readonly id: string
	readonly criteria: readonly GraphCriterion[]
}

/** A criterion of a Milestone, by node index and criterion index. */
export interface GraphEdge {
	readonly node: number
	readonly criterion: number
}

export interface GraphReport {
	/** Per node: true when every criterion is a date or names a static Milestone (ADR 0012). */
	readonly isStatic: readonly boolean[]
	/** Node indexes in dependency order, ties in Scenario order; cycle members are left out. */
	readonly order: readonly number[]
	/** Criteria whose reference names no node. */
	readonly unknown: readonly GraphEdge[]
	/** Criteria whose reference closes a cycle. */
	readonly cycles: readonly GraphEdge[]
	/** Criteria with a negative `months` that name a dynamic node. */
	readonly lookahead: readonly GraphEdge[]
}
