/*
 * The markup of a `flow` picture: each node a card, the result card emphasised, and an arrow
 * leading every node but the first that is decoration for the eye and hidden from a screen reader. Sizes and radius
 * come from Tailwind utilities, because the theme seam owns every font-size and radius role.
 */

import type { FlowNode } from "./flow-fence"
import type { HastNode } from "./hast"

/** The classes of the result's figure: larger text is a Tailwind utility, never a font-size. */
const RESULT_DETAIL_CLASSES = ["docs-flow-detail", "text-xl", "font-semibold"] as const

/** One span of text, the element every node is built from. */
function span(className: readonly string[], value: string): HastNode {
	return {
		type: "element",
		tagName: "span",
		properties: { className: [...className] },
		children: [{ type: "text", value }],
	}
}

/** The arrow from the node before, decoration only. */
function arrowElement(): HastNode {
	return {
		type: "element",
		tagName: "span",
		properties: { ariaHidden: true, className: ["docs-flow-arrow", "text-xs"] },
		children: [{ type: "text", value: "→" }],
	}
}

/**
 * A node's words: a label above its detail, or the label alone as the node's text. A label alone
 * keeps its case, because it may be a command such as `traj init`.
 */
function cardChildren(node: FlowNode, last: boolean): HastNode[] {
	if (node.detail === undefined) {
		return [span(last ? RESULT_DETAIL_CLASSES : ["docs-flow-detail"], node.label)]
	}
	return [
		span(["docs-flow-label", "text-xs"], node.label),
		span(last ? RESULT_DETAIL_CLASSES : ["docs-flow-detail"], node.detail),
	]
}

/**
 * One node as a card, with the arrow from the node before it. The arrow leads the node, so a row
 * that wraps opens on an arrow instead of ending on one.
 */
function nodeElement(node: FlowNode, first: boolean, last: boolean): HastNode {
	const card: HastNode = {
		type: "element",
		tagName: "div",
		properties: { className: ["docs-flow-card", "rounded-md"] },
		children: cardChildren(node, last),
	}
	return {
		type: "element",
		tagName: "li",
		properties: {
			className: last ? ["docs-flow-node", "docs-flow-result"] : ["docs-flow-node"],
		},
		children: first ? [card] : [arrowElement(), card],
	}
}

/** The whole flow: a list with its own accessible name, so it reads as the steps it shows. */
export function flowElement(nodes: readonly FlowNode[]): HastNode {
	return {
		type: "element",
		tagName: "ol",
		properties: {
			className: ["docs-flow"],
			ariaLabel: `Steps: ${nodes.map((node) => node.label).join(", ")}`,
			role: "list",
		},
		children: nodes.map((node, at) => nodeElement(node, at === 0, at === nodes.length - 1)),
	}
}
