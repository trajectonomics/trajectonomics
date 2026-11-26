/** The parts of the Demo snapshot this browser check patches: its base plan's cash flow rows and document. */
export interface CashflowRow {
	readonly index?: number
	readonly group?: string
	/** An `estateLines` row's date, which a patch renames the lines of. */
	date?: string
	/** An `estateLines` row's line, which names its band and which a patch renames. */
	line?: string
	readonly kind?: string
	id?: string | null
	[key: string]: unknown
}

export interface CashflowTable {
	readonly name: string
	readonly rows: CashflowRow[]
}

export interface ProjectionRead {
	readonly ok: boolean
	readonly data?: { readonly tables: CashflowTable[] }
}

export interface DocumentFlow {
	id: string
	displayLabel?: string
	[key: string]: unknown
}

export interface ScenarioDocument {
	flows: DocumentFlow[]
}

export interface DocumentRead {
	readonly ok: boolean
	readonly data?: { readonly scenario: { readonly document: ScenarioDocument } }
}

export interface FlowSnapshot {
	readonly params: { readonly scenarios: readonly string[] }
	readonly reads: {
		readonly projections: Record<string, ProjectionRead>
		readonly documents: Record<string, DocumentRead>
	}
	[key: string]: unknown
}

/** The rows of the first year, and the whole table the clones are pushed to. */
export interface Year {
	readonly all: CashflowRow[]
	readonly rows: CashflowRow[]
}
