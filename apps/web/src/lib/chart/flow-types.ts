/**
 * The shapes of the flow diagram: the bands the caller states, the geometry the layout returns. Types only.
 */

/** What a band is, which the page styles and names. */
export type FlowKind =
	| "income"
	| "withdrawal"
	| "drawn"
	| "refund"
	| "unmet"
	| "tax"
	| "spending"
	| "saving"
	| "left-over"

/** One band the caller states: its key, its kind, its label and its amount, the CLI's decimal string. */
export interface FlowBand {
	readonly key: string
	readonly kind: FlowKind
	readonly label: string
	readonly amount: string
}

/** The bands of one year: the sources on the left and the uses on the right, each in the order drawn from the top. */
export interface FlowInput {
	readonly sources: readonly FlowBand[]
	readonly uses: readonly FlowBand[]
}

/** A node the diagram draws beside the cash node: a source's or a use's rectangle and its label. */
export interface FlowNode {
	readonly key: string
	readonly kind: FlowKind
	readonly label: string
	readonly amount: string
	readonly side: "source" | "use"
	readonly x: number
	readonly y: number
	readonly height: number
	readonly labelX: number
	readonly labelY: number
	readonly anchor: "start" | "end"
}

/** The band between a node and the cash node, as one closed path. */
export interface FlowLink {
	readonly key: string
	readonly kind: FlowKind
	readonly label: string
	readonly amount: string
	readonly d: string
}

/** The geometry of a year's diagram: its size, the cash node, the nodes and the links. */
export interface FlowLayout {
	readonly width: number
	readonly height: number
	readonly cash: {
		readonly x: number
		readonly y: number
		readonly width: number
		readonly height: number
	}
	readonly nodes: readonly FlowNode[]
	readonly links: readonly FlowLink[]
}
