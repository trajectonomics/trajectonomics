import { isAppError } from "../../errors"
import { deepEqual } from "../diff-equal"
import type { ScenarioDocument } from "../document"
import { parsePath } from "../set-parse"
import { parseUnstated, type UnstatedEntry } from "./entry"
import { valueAt } from "./value-at"

/** The stored side a write compares against: its document and its unstated column (cli ADR-0084). */
export type UnstatedStored = {
	document: ScenarioDocument
	unstated: string | null
}

function segmentsOf(path: string): readonly string[] | null {
	const segments = parsePath(path, 0)
	return isAppError(segments) ? null : segments
}

/** Whether `stated` names `path` or an ancestor of it: a Set states everything under it. */
function states(stated: readonly string[], path: readonly string[]): boolean {
	if (stated.length > path.length) return false
	return stated.every((segment, index) => path[index] === segment)
}

/**
 * The entries a write keeps (cli ADR-0084): one stays while its value resolves in both documents and
 * is equal, and no Set names its path or an ancestor. A write that leaves the value alone keeps it;
 * a Set at the same value clears it, because the value is now something a person typed.
 */
export function unstatedKept(
	stored: UnstatedStored,
	nextDocument: ScenarioDocument,
	stated: readonly string[],
): UnstatedEntry[] {
	const parsed = parseUnstated(stored.unstated)
	if (isAppError(parsed)) return []
	const statedPaths = stated
		.map((path) => segmentsOf(path))
		.filter((segments): segments is readonly string[] => segments !== null)
	return parsed.filter((entry) => {
		const segments = segmentsOf(entry.path)
		if (segments === null) return false
		if (statedPaths.some((stated) => states(stated, segments))) return false
		const before = valueAt(stored.document, entry.path)
		const after = valueAt(nextDocument, entry.path)
		return before.found && after.found && deepEqual(before.value, after.value)
	})
}
