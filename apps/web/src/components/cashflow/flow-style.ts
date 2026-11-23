import type { FlowKind } from "../../lib/chart/flow"

/**
 * The fill of each kind of band, from the brand's Semantic Token Roles. Each group has its own hue or
 * strength, so a reader can tell the groups apart without the labels. Unmet money is a dashed outline with
 * no fill, so a Shortfall reads as a gap rather than as one more source.
 */
export const FLOW_FILL: Readonly<Record<FlowKind, string>> = {
	income: "fill-primary/70",
	withdrawal: "fill-accent/80",
	drawn: "fill-accent",
	refund: "fill-primary/50",
	unmet: "fill-none stroke-destructive [stroke-dasharray:4_3]",
	tax: "fill-destructive/75",
	spending: "fill-foreground/85",
	saving: "fill-accent/80",
	"left-over": "fill-ring",
}
