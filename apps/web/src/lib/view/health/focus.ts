import type { Doctor, Snapshot } from "../../contract"
import { doctorView } from "./doctor"
import { readAudit } from "./read-audit"

/** One check the Health focus point draws, from the doctor or from a failed Read. */
export interface HealthFocusCheck {
	readonly key: string
	readonly label: string
	readonly detail: string
	/** Decided by the same predicate the doctor table uses to style a status, `status === "fail"`. */
	readonly passed: boolean
}

/** The Health page's focus point: one ring of every check, and the count that needs a person. */
export interface HealthFocus {
	/** The question and the answer, for the sr-only heading. */
	readonly label: string
	/** "All good", or "<n> to check". */
	readonly answer: string
	readonly tone: "plain" | "warn"
	readonly checks: readonly HealthFocusCheck[]
	/** The one primary action, to the first failing check's row; none when every check passes. */
	readonly action: { readonly label: string; readonly href: string } | undefined
}

/** The doctor's checks in the page's words, passing where the table would not style them as a failure. */
function doctorChecks(doctor: Doctor): HealthFocusCheck[] {
	return doctorView(doctor).checks.map((check) => ({
		key: check.key,
		label: check.label,
		detail: check.detail,
		passed: check.status !== "fail",
	}))
}

/** Each failed Read of the Snapshot, with the CLI's error as its detail. */
function readChecks(snapshot: Snapshot): HealthFocusCheck[] {
	return readAudit(snapshot)
		.filter((row) => row.failed)
		.map((row) => ({
			key: row.key,
			label: row.question,
			detail: row.error === null ? "" : `${row.error.code}: ${row.error.message}`,
			passed: false,
		}))
}

/** The words with one full stop, whether or not the CLI's own sentence ends with one. */
function sentence(text: string): string {
	return text.endsWith(".") ? text : `${text}.`
}

/**
 * The focus point of the doctor's checks and every failed Read. Null when there is no check to draw, which
 * is the page's own empty state. Every word is the CLI's, or the page's for a check it names.
 */
export function healthFocusView(doctor: Doctor, snapshot: Snapshot): HealthFocus | null {
	const checks = [...doctorChecks(doctor), ...readChecks(snapshot)]
	if (checks.length === 0) return null
	const failing = checks.filter((check) => !check.passed)
	const first = failing[0]
	const answer = first === undefined ? "All good" : `${failing.length} to check`
	const detail = first === undefined ? "" : ` ${first.label}: ${sentence(first.detail)}`
	return {
		label: `Is everything in order? ${answer}.${detail}`,
		answer,
		tone: first === undefined ? "plain" : "warn",
		checks,
		action:
			first === undefined ? undefined : { label: "See the first one", href: `#check-${first.key}` },
	}
}
