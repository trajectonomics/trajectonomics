// The Demo snapshot's shape, as the money switch's checks read and patch it (cli ADR-0085). The Demo's own
// chance draws from a Return model file, which states no inflation factor, so the browser adds the real
// Bands, a stated inflation swing and one future read in advance rather than regenerating the Demo.

interface Band {
	index: number
	to: string
	netWorth: { level: number; value: string }[]
}

interface Read<T> {
	ok: boolean
	argv: string[]
	data: T
}

interface ProjShape {
	tables: { name: string; rows: { index: number; from: string; to: string }[] }[]
}

interface ChanceShape {
	bands: Band[]
	realBands?: Band[]
	definition: unknown
	tables: { name: string; count: number; rows: { index: number }[] }[]
}

interface DocShape {
	scenario: { document: { economy?: Record<string, unknown> } }
}

export interface DemoSnapshot extends Record<string, unknown> {
	reads: {
		chance: { base: Read<ChanceShape> }
		documents: { base: Read<DocShape> }
		projections: { base: Read<ProjShape & Record<string, unknown>> }
		paths?: Record<string, Record<string, unknown>>
	}
}

/** The figure every Percentile of the real Bands states, so a check can name today's money whatever it shows. */
export const TODAY = "1000.00"
export const TODAY_SHOWN = "1,000.00"
export const INFLATION_BPS = 250
