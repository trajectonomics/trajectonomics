import type { FlowKind } from "../../lib/chart/flow"

/**
 * The fill of each kind of band. Unmet money is a dashed outline with no solid fill, so a Shortfall reads
 * as a gap rather than as one more source.
 */
export const FLOW_FILL: Readonly<Record<FlowKind, string>> = {
	income: "fill-primary/70",
	withdrawal: "fill-accent/70",
	drawn: "fill-accent/40",
	refund: "fill-primary/40",
	unmet: "fill-none stroke-destructive [stroke-dasharray:4_3]",
	tax: "fill-muted-foreground/60",
	spending: "fill-foreground/50",
	saving: "fill-primary/50",
	"left-over": "fill-primary/25",
}
