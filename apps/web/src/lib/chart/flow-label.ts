import { FLOW_WIDTH } from "./flow"
import { FLOW_MARGIN } from "./flow-geometry"
import type { FlowNode } from "./flow-types"
/**
 * A generous width for one character of a label in the diagram's 12-unit text: wide enough for digits and
 * capitals, so a label measured with it never runs past the edge of the box.
 */
export const LABEL_CHAR_WIDTH = 7.5

/** The room a node's label has, from its anchor to the edge of the box on its side. */
export function labelRoom(node: Pick<FlowNode, "labelX" | "anchor">): number {
	return node.anchor === "end" ? node.labelX - FLOW_MARGIN : FLOW_WIDTH - FLOW_MARGIN - node.labelX
}

/**
 * A node's label as the diagram draws it: the name, then the amount, shortened with an ellipsis so it fits
 * its room. The amount is never shortened: the name gives way first. The full name stays in the band's
 * label and the table, so nothing is lost to a screen reader.
 */
export function fittedLabel(
	node: Pick<FlowNode, "label" | "labelX" | "anchor">,
	amount: string,
): string {
	const fits = Math.floor(labelRoom(node) / LABEL_CHAR_WIDTH)
	const full = `${node.label} ${amount}`
	if (full.length <= fits) return full
	const nameRoom = fits - amount.length - 2
	return nameRoom <= 0 ? amount : `${node.label.slice(0, nameRoom).trimEnd()}… ${amount}`
}
