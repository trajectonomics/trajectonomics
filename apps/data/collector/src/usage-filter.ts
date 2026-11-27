import { OPENCODE_DB_SOURCE } from "./extract/opencode"
import type { UsageRow } from "./types"

/**
 * Drops rows whose source includes the OpenCode database at or before the cutoff; a copied
 * database would otherwise count another machine's usage twice.
 */
export function dropOpenCodeBefore(rows: readonly UsageRow[], cutoffIso: string): UsageRow[] {
	const cutoffMs = Date.parse(cutoffIso)
	if (Number.isNaN(cutoffMs)) {
		throw new Error(`--skip-opencode-before is not an ISO timestamp: ${cutoffIso}`)
	}
	return rows.filter((row) => {
		const fromOpenCode = row.source.split("+").includes(OPENCODE_DB_SOURCE)
		return !fromOpenCode || Date.parse(row.hourUtc) > cutoffMs
	})
}
