import type { Doctor } from "../../contract"

/** The check names the CLI prints, in the words the page shows. */
export const CHECK_LABELS: Readonly<Record<Doctor["checks"][number]["name"], string>> = {
	directory: "Data directory",
	writable: "Directory writable",
	database: "Database",
	integrity: "Integrity",
	ledger: "Ledger",
	trialBalance: "Trial balance",
}

/** One doctor check, with the CLI's status and detail unchanged. */
export interface CheckLine {
	readonly key: string
	readonly label: string
	readonly status: Doctor["checks"][number]["status"]
	readonly detail: string
}

/** The health page's view of a doctor result. Counts are the CLI's; no figure is computed here. */
export interface DoctorView {
	readonly ok: boolean
	readonly cliVersion: string
	readonly checks: readonly CheckLine[]
	readonly directory: {
		readonly path: string
		readonly exists: boolean
		readonly writable: boolean
	}
	readonly database: {
		readonly path: string
		readonly size: string
		readonly schema: string
	}
	readonly rows: readonly { readonly label: string; readonly count: string }[]
	/** The trial balance the CLI stated, or null when the doctor did not check one. */
	readonly trialBalance: Doctor["trialBalance"] | null
}

/** A doctor result as the health page shows it. */
export function doctorView(doctor: Doctor): DoctorView {
	return {
		ok: doctor.ok,
		cliVersion: doctor.cliVersion,
		checks: doctor.checks.map((check) => ({
			key: check.name,
			label: CHECK_LABELS[check.name],
			status: check.status,
			detail: check.detail,
		})),
		directory: { ...doctor.directory },
		database: {
			path: doctor.database.path,
			size: `${formatCount(doctor.database.bytes)} bytes`,
			schema: schemaOf(doctor.database.schemaVersion, doctor.database.head),
		},
		rows: [
			{ label: "Entities", count: formatCount(doctor.rows.entity) },
			{ label: "Accounts", count: formatCount(doctor.rows.account) },
			{ label: "Transactions", count: formatCount(doctor.rows.tx) },
			{ label: "Postings", count: formatCount(doctor.rows.posting) },
			{ label: "Scenarios", count: formatCount(doctor.rows.scenario) },
		],
		trialBalance: doctor.trialBalance ?? null,
	}
}

function schemaOf(version: number | null, head: number): string {
	if (version === null) return `No schema yet; the latest is ${head}`
	return `Version ${version} of ${head}`
}

/** A whole count with its thousands grouped, such as "233,472". Digits only; no arithmetic. */
export function formatCount(count: number): string {
	return String(count).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}
