import type { Snapshot } from "../../contract"
import { healthView } from "../overview/health"
import { warningsLabel } from "../overview/hero"

/**
 * The words the Records group's dot says when the ledger's health has failed checks: "1 thing to check",
 * "2 things to check", or null when every check passes or the Snapshot holds no doctor read. The count is
 * the one the Overview's health card states, and the page adds nothing to it.
 */
export function healthWarningLabel(snapshot: Snapshot): string | null {
	const read = snapshot.reads.doctor
	if (!read.ok) return null
	return warningsLabel(healthView(read.data).failed)
}
