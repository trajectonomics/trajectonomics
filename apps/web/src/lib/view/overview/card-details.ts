/** One figure a summary card keeps in its Details: the CLI's string, never a rounded copy. */
export interface CardFigure {
	/** The figure's name, such as "Closing net worth" or "Tax owed". */
	readonly label: string
	/** The CLI's string: a money amount, a percentage or a count, shown as it stands. */
	readonly value: string
	/** True for a money amount, which Hide amounts masks; false for a count or a share. */
	readonly money: boolean
	readonly currency?: string | undefined
	/** A key for the figure when two of them share a label. */
	readonly key?: string | undefined
}
