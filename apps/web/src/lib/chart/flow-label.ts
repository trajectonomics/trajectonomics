import { FLOW_WIDTH } from "./flow"
import { FLOW_MARGIN } from "./flow-geometry"
import type { FlowNode } from "./flow-types"
import { fittedKeepingSuffix } from "./label-keep"
import { type TextMeasure, textWidth } from "./label-width"

/** The room a node's label has, from its anchor to the edge of the box on its side. */
export function labelRoom(node: Pick<FlowNode, "labelX" | "anchor">): number {
	return node.anchor === "end" ? node.labelX - FLOW_MARGIN : FLOW_WIDTH - FLOW_MARGIN - node.labelX
}

/**
 * A node's label as the diagram draws it: the name, which is clipped to its room, the amount, which is
 * never cut, and where each sits. The name's clip ends before the amount, so it can never paint over it.
 */
export interface FlowLabel {
	/** The name, shortened to its room, with a twin's id kept when the label names one. */
	readonly label: string
	readonly amount: string
	/** Where the name's text is anchored, on the side away from the amount. */
	readonly labelX: number
	/** The clip that holds the name: its left edge and its width. */
	readonly clipX: number
	readonly clipWidth: number
	/** Where the amount ends; it is always right-anchored. */
	readonly amountX: number
}

/**
 * A node's label as the diagram draws it. The name is shortened with an ellipsis so that it and the amount
 * fit its room, measured in the page's font when `measure` is given and in a conservative estimate when
 * not. The amount is whole. The full name stays in the band's label and the table, so nothing is lost to a
 * screen reader.
 */
export function fittedLabel(
	node: Pick<FlowNode, "label" | "labelX" | "anchor" | "keep">,
	amount: string,
	measure?: TextMeasure,
): FlowLabel {
	const room = labelRoom(node)
	const space = widthOf(" ", measure)
	const amountWidth = widthOf(amount, measure)
	const clipWidth = Math.max(0, room - amountWidth - space)
	const fitted = fittedKeepingSuffix(node.label, clipWidth, false, node.keep ?? null, measure)
	const label = fitted.text
	const leftwards = node.anchor === "end"
	const labelX = leftwards ? node.labelX - amountWidth - space : node.labelX
	return {
		label,
		amount,
		labelX,
		clipX: leftwards ? labelX - clipWidth : labelX,
		clipWidth,
		amountX: leftwards
			? node.labelX
			: node.labelX + fitted.width + (label === "" ? 0 : space) + amountWidth,
	}
}

/** One string's width in the chart's 12px text: measured in the page, or estimated when it cannot measure. */
function widthOf(text: string, measure?: TextMeasure): number {
	return measure === undefined ? textWidth(text, false) : measure(text)
}
