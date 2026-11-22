import type { GraphEdge, GraphNode, GraphReport } from "./graph-types"
import { closingEdges, indexOf, orderOf, staticFlags, targetOf } from "./graph-walk"

export type { GraphCriterion, GraphEdge, GraphNode, GraphReport } from "./graph-types"

/** Classifies, orders and checks the Milestone references of a Scenario. Pure and total. */
export function analyse(nodes: readonly GraphNode[]): GraphReport {
	const index = indexOf(nodes)
	const isStatic = staticFlags(nodes, index)
	const unknown: GraphEdge[] = []
	const lookahead: GraphEdge[] = []
	nodes.forEach((node, position) => {
		node.criteria.forEach((criterion, at) => {
			if (criterion.kind !== "milestone") return
			const target = targetOf(criterion, index)
			const edge = { node: position, criterion: at }
			if (target === undefined) unknown.push(edge)
			else if (criterion.months < 0 && !isStatic[target]) lookahead.push(edge)
		})
	})
	return {
		isStatic,
		order: orderOf(nodes, index),
		unknown,
		cycles: closingEdges(nodes, index),
		lookahead,
	}
}
