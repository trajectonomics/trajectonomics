import { z } from "zod"
import { countsSchema } from "../counts"
import type { RestoreCounts } from "../store"
import { type DoctorTrialBalance, doctorTrialBalance } from "./trial-output"

/** One thing `traj doctor` looked at: `pass`, `fail`, or `skipped` with the reason it could not. */
export const DOCTOR_CHECKS = [
	"directory",
	"writable",
	"database",
	"integrity",
	"ledger",
	"trialBalance",
] as const
export type DoctorCheckName = (typeof DOCTOR_CHECKS)[number]
export type DoctorStatus = "pass" | "fail" | "skipped"
export type DoctorCheck = { name: DoctorCheckName; status: DoctorStatus; detail: string }

/**
 * `traj doctor`'s result. `ok` is true only when no check failed; a skipped check is one the
 * caller did not ask for (the trial balance needs `--as-of`), so it is not a failure.
 */
export type DoctorResult = {
	ok: boolean
	cliVersion: string
	directory: { path: string; exists: boolean; writable: boolean }
	database: {
		path: string
		exists: boolean
		bytes: number
		schemaVersion: number | null
		head: number
		preMigrationCopies: { path: string; schemaVersion: number; bytes: number }[]
		unfinishedCopies: string[]
	}
	rows: RestoreCounts
	trialBalance?: DoctorTrialBalance | undefined
	checks: DoctorCheck[]
}

const check: z.ZodType<DoctorCheck> = z.strictObject({
	name: z.enum(DOCTOR_CHECKS).describe("What was looked at."),
	status: z.enum(["pass", "fail", "skipped"]).describe("The verdict, or why it was not reached."),
	detail: z.string().describe("One sentence stating what was found, or why the check was skipped."),
})

export const doctorOutput: z.ZodType<DoctorResult> = z.strictObject({
	ok: z.boolean().describe("True when no check failed; a skipped check is not a failure."),
	cliVersion: z.string().describe("The version of the traj that ran the check."),
	directory: z.strictObject({
		path: z.string().describe("The data directory, resolved to an absolute path."),
		exists: z.boolean().describe("Whether the data directory exists."),
		writable: z.boolean().describe("Whether a file could be created in it and removed again."),
	}),
	database: z.strictObject({
		path: z.string().describe("The database file's path, resolved."),
		exists: z.boolean().describe("Whether traj.db exists."),
		bytes: z.number().int().describe("The database file's size in bytes; 0 when absent."),
		schemaVersion: z
			.number()
			.int()
			.nullable()
			.describe("The schema version the database holds, or null when it could not be read."),
		head: z.number().int().describe("The schema version this build writes."),
		preMigrationCopies: z
			.array(
				z.strictObject({
					path: z.string().describe("The copy's path, beside the database."),
					schemaVersion: z.number().int().describe("The schema version the copy holds."),
					bytes: z.number().int().describe("The copy's size in bytes."),
				}),
			)
			.describe(
				"The copies traj wrote before an upgrade migrated the database, oldest schema version first; each is a database an older traj can open.",
			),
		unfinishedCopies: z
			.array(z.string())
			.describe(
				"Half-written copies a crash left beside the database, as paths; safe to delete when no traj is running.",
			),
	}),
	rows: countsSchema.describe("Every stored row, tombstones included; all zero when absent."),
	trialBalance: doctorTrialBalance.optional().describe("Present only when --as-of was given."),
	checks: z.array(check).describe("One entry per check, in the order they ran."),
})
