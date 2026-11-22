import { z } from "zod"
import { dateString } from "./date"
import { integer } from "./integer"
import { money } from "./money"

/** `traj doctor --json`: the data directory, the database, the row counts and each check. */
export const doctor = z.strictObject({
	ok: z.boolean(),
	cliVersion: z.string(),
	directory: z.strictObject({ path: z.string(), exists: z.boolean(), writable: z.boolean() }),
	database: z.strictObject({
		path: z.string(),
		exists: z.boolean(),
		bytes: integer,
		schemaVersion: integer.nullable(),
		head: integer,
	}),
	rows: z.strictObject({
		entity: integer,
		account: integer,
		tx: integer,
		posting: integer,
		scenario: integer,
	}),
	trialBalance: z
		.strictObject({
			asOf: dateString,
			totals: z.array(z.strictObject({ currency: z.string(), debit: money, credit: money })),
			balanced: z.boolean(),
		})
		.optional(),
	checks: z.array(
		z.strictObject({
			name: z.enum(["directory", "writable", "database", "integrity", "ledger", "trialBalance"]),
			status: z.enum(["pass", "fail", "skipped"]),
			detail: z.string(),
		}),
	),
})
export type Doctor = z.infer<typeof doctor>
