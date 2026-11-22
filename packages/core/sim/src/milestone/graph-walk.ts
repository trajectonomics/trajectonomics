import type { GraphCriterion, GraphEdge, GraphNode } from "./graph-types"

export type NodeIndex = ReadonlyMap<string, number>

export function indexOf(nodes: readonly GraphNode[]): NodeIndex {
	const index = new Map<string, number>()
	nodes.forEach((node, position) => {
		if (!index.has(node.id)) index.set(node.id, position)
	})
	return index
}

/** The node a criterion names, if it is a reference that some node answers to. */
export function targetOf(criterion: GraphCriterion, index: NodeIndex): number | undefined {
	return criterion.kind === "milestone" ? index.get(criterion.to) : undefined
}

/** Static: every criterion is a date or a reference to a static node. A cycle is never static. */
export function staticFlags(nodes: readonly GraphNode[], index: NodeIndex): boolean[] {
	const memo = new Map<number, boolean>()
	const busy = new Set<number>()
	const isStaticAt = (position: number): boolean => {
		const known = memo.get(position)
		if (known !== undefined) return known
		if (busy.has(position)) return false
		busy.add(position)
		const value = nodes[position]!.criteria.every((criterion) => {
			if (criterion.kind === "date") return true
			const target = targetOf(criterion, index)
			return target !== undefined && isStaticAt(target)
		})
		busy.delete(position)
		memo.set(position, value)
		return value
	}
	return nodes.map((_node, position) => isStaticAt(position))
}

/** Depth-first walk; an edge to a node still on the walk closes a cycle, and is reported there. */
export function closingEdges(nodes: readonly GraphNode[], index: NodeIndex): GraphEdge[] {
	const state = new Array<0 | 1 | 2>(nodes.length).fill(0)
	const found: GraphEdge[] = []
	const visit = (position: number): void => {
		state[position] = 1
		nodes[position]!.criteria.forEach((criterion, at) => {
			const target = targetOf(criterion, index)
			if (target === undefined) return
			if (state[target] === 1) found.push({ node: position, criterion: at })
			else if (state[target] === 0) visit(target)
		})
		state[position] = 2
	}
	nodes.forEach((_node, position) => {
		if (state[position] === 0) visit(position)
	})
	return found
}

/** Whether every Milestone a node names is already placed. */
function depsPlaced(node: GraphNode, index: NodeIndex, placed: ReadonlySet<number>): boolean {
	return node.criteria.every((criterion) => {
		const target = targetOf(criterion, index)
		return target === undefined || placed.has(target)
	})
}

/** The earliest unplaced node in Scenario order whose dependencies are all placed. */
function readyNode(
	nodes: readonly GraphNode[],
	index: NodeIndex,
	placed: ReadonlySet<number>,
): number | undefined {
	for (let position = 0; position < nodes.length; position++) {
		if (!placed.has(position) && depsPlaced(nodes[position]!, index, placed)) return position
	}
	return undefined
}

/** Kahn's order with ties taken in Scenario order; a node on a cycle never becomes ready. */
export function orderOf(nodes: readonly GraphNode[], index: NodeIndex): number[] {
	const placed = new Set<number>()
	const order: number[] = []
	let next = readyNode(nodes, index, placed)
	while (next !== undefined) {
		placed.add(next)
		order.push(next)
		next = readyNode(nodes, index, placed)
	}
	return order
}
