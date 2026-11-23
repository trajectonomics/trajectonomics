import {
	cashEnds,
	columnTotal,
	FLOW_MARGIN,
	nodesOf,
	place,
	ribbon,
	round,
	sized,
} from "./flow-geometry"
import type { FlowInput, FlowLayout } from "./flow-types"

/**
 * The flow diagram of one year's cash flow: sources on the left, one cash node in the middle, uses on the
 * right. Pure: bands in, geometry out (rectangles and cubic path strings), with no DOM and no money
 * arithmetic on the figures a person reads. A band's height is its amount's share of the taller column,
 * and the amount becomes a number only in `toChartNumber`, to place a mark.
 */

export { FLOW_MARGIN, FLOW_MIN_HEIGHT } from "./flow-geometry"
export type { FlowBand, FlowInput, FlowKind, FlowLayout, FlowLink, FlowNode } from "./flow-types"

/** The width of the diagram, in the units of its viewBox. */
export const FLOW_WIDTH = 800
/** The width of each node rectangle. */
export const FLOW_NODE_WIDTH = 12
/** The x of the left column's nodes, the cash node's x and the right column's nodes. */
export const FLOW_SOURCE_X = 230
export const FLOW_CASH_X = 400
export const FLOW_USE_X = 570
/** The height of the taller column's bands in pixels, before a thin band is lifted to the minimum. */
export const FLOW_COLUMN_HEIGHT = 300
/** The gap between a node and its label. */
const LABEL_GAP = 8

/**
 * The geometry of one year's flow: the left column's bands, the cash node, and the right column's bands.
 * A column is stacked from the top, with no gap, so the bands of a column touch and the cash node is as
 * tall as the taller column. A zero band draws nothing, and an empty year is an empty diagram.
 */
export function layoutFlow(input: FlowInput): FlowLayout {
	const sources = sized(input.sources)
	const uses = sized(input.uses)
	const largest = Math.max(columnTotal(sources), columnTotal(uses))
	const scale = largest > 0 ? FLOW_COLUMN_HEIGHT / largest : 0
	const left = place(sources, scale)
	const right = place(uses, scale)
	const cashHeight = Math.max(left.extent, right.extent)
	const sourceX = FLOW_SOURCE_X + FLOW_NODE_WIDTH
	const useX = FLOW_USE_X

	const links = [
		...cashEnds(left.placed).map(({ entry, top, bottom }) => ({
			entry,
			d: ribbon(sourceX, entry.y, entry.y + entry.height, FLOW_CASH_X, top, bottom),
		})),
		...cashEnds(right.placed).map(({ entry, top, bottom }) => ({
			entry,
			d: ribbon(FLOW_CASH_X + FLOW_NODE_WIDTH, top, bottom, useX, entry.y, entry.y + entry.height),
		})),
	].map(({ entry, d }) => ({
		key: entry.band.key,
		kind: entry.band.kind,
		label: entry.band.label,
		amount: entry.band.amount,
		d,
	}))

	return {
		width: FLOW_WIDTH,
		height: round(cashHeight + 2 * FLOW_MARGIN),
		cash: {
			x: FLOW_CASH_X,
			y: FLOW_MARGIN,
			width: FLOW_NODE_WIDTH,
			height: round(cashHeight),
		},
		nodes: [
			...nodesOf(left.placed, "source", FLOW_SOURCE_X, FLOW_SOURCE_X - LABEL_GAP, "end"),
			...nodesOf(right.placed, "use", useX, useX + FLOW_NODE_WIDTH + LABEL_GAP, "start"),
		],
		links,
	}
}
