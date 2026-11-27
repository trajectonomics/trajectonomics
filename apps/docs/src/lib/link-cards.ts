/*
 * The "What next" list becomes a grid of link cards. It stays a real unordered list: the plugin
 * only marks the list and wraps the line after each link, and the stylesheet draws the cards. The
 * leading `: ` a Markdown sentence needs is dropped where the link becomes the card's title.
 */

import type { HastNode, HastPlugin } from "./hast"

/** A colon that introduces the line after a link, as `- [Page](/url): the words` writes it. */
const LEADING_COLON = /^\s*:\s*/

/** The classes the plugin adds to the list and to each card. */
const LIST_CLASS = "docs-link-cards"
const LINE_CLASSES = ["docs-link-card-line", "text-sm"] as const

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

/** The link a list item starts with, or undefined when it starts with anything else. */
function leadingLink(item: HastNode): HastNode | undefined {
	if (item.tagName !== "li") return undefined
	const first = (item.children ?? []).find((child) => child.type === "element")
	return first?.tagName === "a" ? first : undefined
}

/** Whether every item starts with a link and then says something after it. */
function isLinkList(node: HastNode): boolean {
	if (node.tagName !== "ul") return false
	const items = (node.children ?? []).filter((child) => child.type === "element")
	if (items.length === 0) return false
	return items.every((item) => {
		const link = leadingLink(item)
		if (link === undefined) return false
		const children = item.children ?? []
		return children.slice(children.indexOf(link) + 1).some((child) => child.type === "text")
	})
}

/** One item as a card: its link, then the line after it without the colon, as one span. */
function cardItem(item: HastNode): HastNode {
	const children = [...(item.children ?? [])]
	const at = children.findIndex((child) => child.tagName === "a")
	const link = children[at]
	if (link === undefined) return item
	const line = children
		.slice(at + 1)
		.map((child) =>
			child.type === "text"
				? { ...child, value: (child.value ?? "").replace(LEADING_COLON, "") }
				: child,
		)
		.filter((child) => child.type !== "text" || (child.value ?? "").trim() !== "")
	const body: HastNode = {
		type: "element",
		tagName: "span",
		properties: { className: [...LINE_CLASSES] },
		children: line,
	}
	return withClasses({ ...item, children: [link, body] }, ["rounded-md"])
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
