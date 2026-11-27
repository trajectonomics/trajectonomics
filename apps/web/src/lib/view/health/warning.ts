import type { Snapshot } from "../../contract"
import { healthView } from "../overview/health"
import { warningsLabel } from "../overview/hero"

/** The health checks that failed, and the words the Records dot and the focus point's chip show. */
export interface HealthWarning {
	readonly count: number
	readonly label: string
}

/**
 * The ledger's failed health checks, or null when every check passes or the Snapshot holds no doctor read.
 * The count is the one the Overview states, and the words are the Records group's.
 */
export function healthWarning(snapshot: Snapshot): HealthWarning | null {
	const read = snapshot.reads.doctor
	if (!read.ok) return null
	const count = healthView(read.data).failed
	const label = warningsLabel(count)
	return label === null ? null : { count, label }
}

/** The words the Records group's dot says when the ledger's health has failed checks, or null. */
export function healthWarningLabel(snapshot: Snapshot): string | null {
	return healthWarning(snapshot)?.label ?? null
}
