/*
 * A `flow` fence becomes the page's picture of a process: an ordered list of real text nodes, so a
 * screen reader reads the same steps a sighted reader sees. The Markdown twin keeps the fence as
 * plain text, which an agent reads as the numbered steps it is (docs/design/portal-shell.md).
 */

import { flowElement } from "./flow-markup"
import type { HastNode, HastPlugin } from "./hast"

/** The fence language this plugin turns: ```flow. */
const FLOW_LANGUAGE = "language-flow"

/** The separator between two nodes: an ASCII arrow or the character it stands for. */
const ARROW = /\s*(?:->|→)\s*/

/** One node of a flow: its label, and the detail shown under it in the mono face. */
export interface FlowNode {
	readonly label: string
	readonly detail?: string | undefined
}

/** The text of a hast subtree. */
function textOf(node: HastNode): string {
	if (node.type === "text") return node.value ?? ""
	return (node.children ?? []).map(textOf).join("")
}

/**
 * The body of a `flow` fence, or undefined when this `pre` is not one. It reads the classic
 * `pre > code.language-flow` and Astro's `pre > pre.language-flow`, before or after
 * `restoreCodeFences` has run.
 */
function fenceBody(node: HastNode): string | undefined {
	const [only] = node.children ?? []
	if (only?.tagName !== "code" && only?.tagName !== "pre") return undefined
	const classes = only.properties?.["className"]
	if (!Array.isArray(classes) || !classes.includes(FLOW_LANGUAGE)) return undefined
	return textOf(only)
}

/** The nodes a flow fence names, in order: `label`, then an optional `: detail`. */
export function parseFlow(body: string): readonly FlowNode[] {
	return body
		.trim()
		.split(ARROW)
		.map((part) => part.trim())
		.filter((part) => part !== "")
		.map((part) => {
			const colon = part.indexOf(":")
			if (colon === -1) return { label: part }
			const label = part.slice(0, colon).trim()
			const detail = part.slice(colon + 1).trim()
			return detail === "" ? { label } : { label, detail }
		})
}

/** The hast plugin that turns every `flow` fence into that list, before the highlighter sees it. */
export function flowFences(): HastPlugin {
	return {
		name: "docs-flow-fences",
		element: {
			filter: ["pre"],
			visit(node, context) {
				const body = fenceBody(node)
				if (body === undefined) return
				const nodes = parseFlow(body)
				if (nodes.length === 0) return
				context.replaceNode(node, flowElement(nodes))
			},
		},
	}
}
