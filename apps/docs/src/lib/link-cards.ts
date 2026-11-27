/*
 * The "What next" list becomes a grid of link cards. It stays a real unordered list: the plugin
 * only marks the list and wraps the line after each link, and the stylesheet draws the cards. The
 * leading `: ` a Markdown sentence needs is dropped where the link becomes the card's title.
 */

import type { HastNode, HastPlugin } from "./hast"

/** The colon a card's line opens with, as `- [Page](/url): the words` writes it. */
const LEADING_COLON = /^\s*:/

/** The colon and the whitespace around it, dropped where the link becomes the card's title. */
const COLON_WITH_SPACE = /^\s*:\s*/

/** The classes the plugin adds to the list and to each card. */
const LIST_CLASS = "docs-link-cards"
const LINE_CLASSES = ["docs-link-card-line", "text-sm"] as const

/** Elements that start a block: an item carrying one says more than its card's one line. */
const BLOCK_TAGS = new Set(["ul", "ol", "p", "pre", "div", "table", "blockquote"])

/** A node's class names, whether it has any or not. */
function classesOf(node: HastNode): readonly string[] {
	const classes = node.properties?.["className"]
	return Array.isArray(classes)
		? classes.filter((value): value is string => typeof value === "string")
		: []
}

/** The node with `names` added to its class list. */
function withClasses(node: HastNode, names: readonly string[]): HastNode {
	return {
		...node,
		properties: { ...node.properties, className: [...classesOf(node), ...names] },
	}
}

/** Whether `node`, or any node below it, is a link or a block element. */
function hasLinkOrBlock(node: HastNode): boolean {
	if (node.type !== "element") return false
	if (node.tagName === "a" || BLOCK_TAGS.has(node.tagName ?? "")) return true
	return (node.children ?? []).some(hasLinkOrBlock)
}

/** The index of the item's leading link when the item is a card, or undefined when it is not. */
function leadingLinkIndex(item: HastNode): number | undefined {
	if (item.tagName !== "li") return undefined
	const children = item.children ?? []
	const first = children.findIndex(
		(child) => !(child.type === "text" && (child.value ?? "").trim() === ""),
	)
	if (children[first]?.tagName !== "a") return undefined
	const colon = children[first + 1]
	if (colon?.type !== "text" || !LEADING_COLON.test(colon.value ?? "")) return undefined
	return children.slice(first + 1).some(hasLinkOrBlock) ? undefined : first
}

/** Whether every item starts with a link and the colon that introduces its line. */
function isLinkList(node: HastNode): boolean {
	if (node.tagName !== "ul") return false
	const items = (node.children ?? []).filter((child) => child.type === "element")
	if (items.length === 0) return false
	return items.every((item) => leadingLinkIndex(item) !== undefined)
}

/** One item as a card: its link, then the line after it without the colon, as one span. */
function cardItem(item: HastNode): HastNode {
	const children = [...(item.children ?? [])]
	const at = leadingLinkIndex(item)
	if (at === undefined) return item
	const line = children
		.slice(at + 1)
		.map((child, offset) =>
			offset === 0 ? { ...child, value: (child.value ?? "").replace(COLON_WITH_SPACE, "") } : child,
		)
	const body: HastNode = {
		type: "element",
		tagName: "span",
		properties: { className: [...LINE_CLASSES] },
		children: line,
	}
	return withClasses({ ...item, children: [...children.slice(0, at + 1), body] }, ["rounded-md"])
}

/** The hast plugin that marks every such list and shapes each item as a card. */
export function linkCards(): HastPlugin {
	return {
		name: "docs-link-cards",
		element: {
			filter: ["ul"],
			visit(node, context) {
				if (!isLinkList(node)) return
				context.replaceNode(node, {
					...withClasses(node, [LIST_CLASS]),
					children: (node.children ?? []).flatMap((child) =>
						child.type === "element" ? [cardItem(child)] : [],
					),
				})
			},
		},
	}
}
