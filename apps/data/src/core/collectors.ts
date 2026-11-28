/** One row of the collectors read: a machine's span and last send for one auth user. */
export type CollectorRow = {
	machine: string
	first_day: string
	last_day: string
	rows: number
	last_received_at: string
}

/** One collector in the API's body: the row's snake case mapped to the browser's camel case. */
export type Collector = {
	machine: string
	firstDay: string
	lastDay: string
	rows: number
	lastSendAt: string
}

/** Maps the collectors query's rows to the API shape, never carrying the auth user id. */
export function collectorsView(rows: readonly CollectorRow[]): Collector[] {
	return rows.map((row) => ({
		machine: row.machine,
		firstDay: row.first_day,
		lastDay: row.last_day,
		rows: row.rows,
		lastSendAt: row.last_received_at,
	}))
}
