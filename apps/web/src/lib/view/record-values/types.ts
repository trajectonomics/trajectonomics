import type { GroupKey } from "./groups"

/** One account the sheet takes a value for. */
export interface SheetRow {
	readonly id: string
	readonly name: string
	readonly currency: string
	/** The CLI's Balance at the As-of, as it states it (a debt is negative); null when it gave none. */
	readonly balance: string | null
	/** The date of the account's last Transaction in the loaded transactions; null when none is loaded. */
	readonly lastDate: string | null
	/** A debt's value is what it still owes, typed as a positive number. */
	readonly owed: boolean
}

export interface SheetGroup {
	readonly key: GroupKey
	readonly title: string
	readonly rows: readonly SheetRow[]
}

/** An income or equity Leaf Account the differences can count against. */
export interface AgainstChoice {
	readonly id: string
	readonly name: string
	readonly currency: string
}

/** The sheet's rows, the accounts it may count against, and what to say when there are none. */
export interface ValueSheet {
	readonly asOf: string
	readonly groups: readonly SheetGroup[]
	readonly choices: readonly AgainstChoice[]
	/** The `traj account add` commands that make an account to count against, one per currency; empty when one exists. */
	readonly addCommands: readonly string[]
	/** The first date the loaded transactions cover, so a missing last date can say "none since"; null when unknown. */
	readonly since: string | null
}
