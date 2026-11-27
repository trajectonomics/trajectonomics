/** The part of a hast node the build's Markdown plugins read and rewrite. */
export interface HastNode {
	readonly type: string
	readonly tagName?: string
	readonly properties?: Record<string, unknown>
	readonly children?: HastNode[]
}

/** The part of the hast visitor API a plugin uses to replace a node. */
export interface HastVisitorContext {
	replaceNode(node: HastNode, newNode: HastNode | readonly HastNode[]): void
}

/** A hast plugin in the shape the Fumadocs collection options accept. */
export interface HastPlugin {
	readonly name: string
	readonly element: {
		readonly filter: string[]
		visit(node: HastNode, context: HastVisitorContext): void
	}
}
