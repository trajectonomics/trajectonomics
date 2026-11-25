import { z } from "zod"

/** A string parsed to a canonical UTC ISO timestamp when it is one; otherwise unchanged. */
export const isoTimestamp = z.string().transform((value) => {
	const ms = Date.parse(value)
	return Number.isNaN(ms) ? value : new Date(ms).toISOString()
})
