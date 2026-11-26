import { FLOW_WIDTH } from "./flow"
import { FLOW_MARGIN } from "./flow-geometry"
import type { FlowNode } from "./flow-types"
import { fittedKeepingSuffix, textWidth } from "./label-width"

/** The room a node's label has, from its anchor to the edge of the box on its side. */
export function labelRoom(node: Pick<FlowNode, "labelX" | "anchor">): number {
	return node.anchor === "end" ? node.labelX - FLOW_MARGIN : FLOW_WIDTH - FLOW_MARGIN - node.labelX
}

/** A node's label as the diagram draws it: the name as far as it fits, and the amount, which is never cut. */
export interface FlowLabel {
	readonly label: string
	readonly amount: string
}

/**
 * A node's label as the diagram draws it: the name shortened with an ellipsis so that it and the amount fit
 * its room, and the amount whole. The name gives way first, cut between graphemes and measured at a
 * conservative width, so it never covers the amount or leaves the box. A twin's `(id)` suffix stays in
 * view. The full name stays in the band's label and the table, so nothing is lost to a screen reader.
 */
export function fittedLabel(
	node: Pick<FlowNode, "label" | "labelX" | "anchor">,
	amount: string,
): FlowLabel {
	const nameRoom = labelRoom(node) - textWidth(` ${amount}`, false)
	return { label: fittedKeepingSuffix(node.label, nameRoom, false).text, amount }
}
