import type { Doctor } from "../../contract"

/** One row count the health card shows, with the reader's name for it. */
export interface HealthCount {
	readonly label: string
	readonly value: number
}

/** The health card's reading of one `doctor` Read. */
export interface HealthView {
	readonly ok: boolean
	readonly failed: number
	readonly checks: number
	readonly counts: readonly HealthCount[]
}

/** The ledger health reading: the CLI's verdict, the failed checks, and the row counts. */
export function healthView(data: Doctor): HealthView {
	return {
		ok: data.ok,
		failed: data.checks.filter((check) => check.status === "fail").length,
		checks: data.checks.length,
		counts: [
			{ label: "Entities", value: data.rows.entity },
			{ label: "Accounts", value: data.rows.account },
			{ label: "Transactions", value: data.rows.tx },
			{ label: "Postings", value: data.rows.posting },
			{ label: "Scenarios", value: data.rows.scenario },
		],
	}
}
