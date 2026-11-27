/** What one expression or type of a Dashboard source states: the codes it names, and whether the scan could read it. */

/** A value read from a source: the codes it states, and whether the scan could read it. */
export interface Value {
	readonly codes: string[]
	readonly read: boolean
}

/** A value that states no code, read without doubt. */
export const NONE: Value = { codes: [], read: true }

/** A value the scan cannot read, so the guard must report it. */
export const UNREAD: Value = { codes: [], read: false }
