/** How the pasted table is laid out: dates down the first column, accounts down it, or one row per value. */
export type Layout = "dates-down" | "accounts-down" | "per-value"

/** Where something is in the pasted table: its row (the header row is 1) and the column's name, or null for the row as a whole. */
export interface Place {
	readonly row: number
	readonly column: string | null
}

/** Something the person must fix in the pasted text before it can be matched. */
export interface ImportProblem extends Place {
	readonly message: string
}

/** One value read from the table: the account's label as typed, the date, and the amount text as typed. */
export interface ImportEntry {
	readonly source: string
	/** The account's name as the table writes it; `source` is the key the match uses. */
	readonly label: string
	readonly date: string
	readonly value: string
	/** True when the date was written in a Buddhist-era year and has been converted. */
	readonly converted: boolean
	readonly row: number
	readonly column: string
}

/** One account of the table (a column, or an account name): what it holds, never a figure. */
export interface ImportSource {
	readonly key: string
	readonly label: string
	readonly count: number
	readonly first: string | null
	readonly last: string | null
}

/** The table, read: its values in date order, its accounts, what to fix, and what was converted. */
export interface ParsedImport {
	readonly entries: readonly ImportEntry[]
	readonly sources: readonly ImportSource[]
	readonly problems: readonly ImportProblem[]
	readonly notes: readonly string[]
}
