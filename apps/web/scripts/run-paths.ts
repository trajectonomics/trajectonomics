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
import { createPool, mapWithPool, type Pool } from "./run-pool"
import type { RunContext } from "./run-traj"

/**
 * The paths the Snapshot reads in advance: for each plan whose chance read lists its representative
 * paths, those five (web ADR 0020). A plan whose chance failed, or was read without `--outcomes`, has none. None at all
 * unless the plan says `readPaths`: only the offline Snapshot reads them in advance; a live dashboard reads a future
 * when it is opened.
 */
export async function runPaths(
	context: RunContext,
	plan: StageTwoPlan,
	chance: Record<string, Read<ProjectionChance>>,
	records: readonly unknown[],
	pool: Pool = createPool(),
): Promise<SnapshotReads["paths"]> {
	const paths: Record<string, Record<string, Read<ProjectionPath>>> = {}
	if (!plan.readPaths) return paths
	const pending: {
		name: string
		key: string
		planned: NonNullable<ReturnType<StageTwoPlan["pathOf"]>>
	}[] = []
	for (const [name, read] of Object.entries(chance)) {
		for (const index of representativeIndexes(read)) {
			const planned = plan.pathOf(name, index)
			if (planned !== null) pending.push({ name, key: pathKey(index), planned })
		}
	}
	const reads = await mapWithPool(pool, pending, ({ planned }) =>
		runPlanned(context, planned, projectionPath, records),
	)
	for (const [i, item] of pending.entries()) {
		let bucket = paths[item.name]
		if (bucket === undefined) {
			bucket = {}
			paths[item.name] = bucket
		}
		bucket[item.key] = reads[i] as Read<ProjectionPath>
	}
	return paths
}
