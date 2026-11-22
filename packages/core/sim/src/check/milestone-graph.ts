import { analyse } from "../milestone/graph"
import type { GraphCriterion, GraphEdge, GraphNode } from "../milestone/graph-types"
import type { Emit, Path } from "./codes"
import { isRecord } from "./shape"

function criterionNode(value: unknown): GraphCriterion {
	if (!isRecord(value)) return { kind: "other" }
	if (value["kind"] === "date") return { kind: "date" }
	const { milestone, months } = value
	if (
		value["kind"] === "milestone" &&
		typeof milestone === "string" &&
		typeof months === "number"
	) {
		return { kind: "milestone", to: milestone, months }
	}
	return { kind: "other" }
}

/** The graph of raw Milestones; a malformed entry becomes an empty node that the shape checks report. */
function nodesOf(milestones: readonly unknown[]): GraphNode[] {
	return milestones.map((item) => {
		const record = isRecord(item) ? item : {}
		const criteria = Array.isArray(record["criteria"]) ? record["criteria"] : []
		const id = typeof record["id"] === "string" ? record["id"] : ""
		return { id, criteria: criteria.map(criterionNode) }
	})
}

function pathOf(path: Path, edge: GraphEdge, key: string): Path {
	return [...path, edge.node, "criteria", edge.criterion, key]
}

/** Reports unknown references, reference cycles and lookahead into a dynamic Milestone. */
export function checkMilestoneGraph(milestones: readonly unknown[], path: Path, emit: Emit): void {
	const report = analyse(nodesOf(milestones))
	for (const edge of report.unknown) emit("UNKNOWN_MILESTONE", pathOf(path, edge, "milestone"))
	for (const edge of report.cycles) emit("MILESTONE_CYCLE", pathOf(path, edge, "milestone"))
	for (const edge of report.lookahead) emit("MILESTONE_LOOKAHEAD", pathOf(path, edge, "months"))
}
