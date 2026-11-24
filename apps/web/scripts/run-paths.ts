import {
	type ProjectionChance,
	type ProjectionPath,
	projectionPath,
	type Read,
	type SnapshotReads,
} from "../src/lib/contract"
import type { StageTwoPlan } from "../src/lib/snapshot"
import { pathKey, representativeIndexes } from "../src/lib/snapshot/paths"
import { runPlanned } from "./run-planned"
import type { RunContext } from "./run-traj"

/**
 * The paths the Snapshot reads in advance, one at a time: for each plan whose chance read lists its representative
 * paths, those five (web ADR 0020). A plan whose chance failed, or was read without `--outcomes`, has none.
 */
export async function runPaths(
	context: RunContext,
	plan: StageTwoPlan,
	chance: Record<string, Read<ProjectionChance>>,
	records: readonly unknown[],
): Promise<SnapshotReads["paths"]> {
	const paths: Record<string, Record<string, Read<ProjectionPath>>> = {}
	for (const [name, read] of Object.entries(chance)) {
		const reads: Record<string, Read<ProjectionPath>> = {}
		for (const index of representativeIndexes(read)) {
			const planned = plan.pathOf(name, index)
			if (planned === null) continue
			reads[pathKey(index)] = await runPlanned(context, planned, projectionPath, records)
		}
		if (Object.keys(reads).length > 0) paths[name] = reads
	}
	return paths
}
