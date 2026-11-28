/** One row of the hourly usage API: the org's sum for one plan at one UTC hour. */
export type HourlyRow = {
	hourUtc: string
	plan: string
	tokensTotal: number
	requests: number
}

/** The body of the hourly usage API. */
export type HourlyPayload = {
	asOf: string
	methodVersion: number
	series: string
	from: string
	to: string
	rows: HourlyRow[]
}
