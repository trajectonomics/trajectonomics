import { FLOW_WIDTH } from "./flow"
import { FLOW_MARGIN } from "./flow-geometry"
import type { FlowNode } from "./flow-types"
import { fitted, type TextMeasure, textWidth } from "./label-width"

/** The least space between a name and its amount, so a measurement that runs a little short cannot join them. */
const NAME_GAP = 3
/** How far a name's clip reaches past the fitted text on each side, for a glyph that paints past its measured advance. */
const CLIP_SLACK = 2

/** The room a node's label has, from its anchor to the edge of the box on its side. */
export function labelRoom(node: Pick<FlowNode, "labelX" | "anchor">): number {
	return node.anchor === "end" ? node.labelX - FLOW_MARGIN : FLOW_WIDTH - FLOW_MARGIN - node.labelX
}

/**
 * A node's label as the diagram draws it: the name, which is clipped to its room, the amount, which is
 * never cut, and where each sits. The name's clip ends before the amount, so it can never paint over it.
 */
export interface FlowLabel {
	/** The name, kept from its start and ended with an ellipsis when it does not fit. */
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
 * not. The amount is whole. The name keeps its start and loses its end, as on `main`, so a twin whose
 * `(id)` differs at its start stays distinct on the diagram. The full label stays in the band's
 * `aria-label` and the table, so the id is never lost (#667 allows the cut).
 */
export function fittedLabel(
	node: Pick<FlowNode, "label" | "labelX" | "anchor">,
	amount: string,
	measure?: TextMeasure,
): FlowLabel {
	const room = labelRoom(node)
	const amountWidth = textWidth(amount, false, measure)
	const nameRoom = Math.max(0, room - amountWidth - NAME_GAP)
	const name = fitted(node.label, nameRoom, false, measure)
	const leftwards = node.anchor === "end"
	const labelX = leftwards ? node.labelX - amountWidth - NAME_GAP : node.labelX
	// A start-anchored name is clipped to the width it was fitted to, so the clip never runs on into the
	// amount even when the page draws the words a little wider than the measure expected.
	const clip = leftwards ? nameRoom : Math.min(nameRoom, name.width)
	return {
		label: name.text,
		amount,
		labelX,
		clipX: leftwards ? labelX - clip - CLIP_SLACK : labelX - CLIP_SLACK,
		clipWidth: clip + 2 * CLIP_SLACK,
		amountX: leftwards
			? node.labelX
			: node.labelX + name.width + (name.text === "" ? 0 : NAME_GAP) + amountWidth,
	}
}
