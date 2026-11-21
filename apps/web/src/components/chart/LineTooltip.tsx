export interface TooltipRow {
	readonly name: string
	/** The string the tooltip shows: the CLI's figure, already masked when amounts are hidden. */
	readonly display: string
	/** The stroke class of the series, to match its line. */
	readonly stroke: string
}

export interface LineTooltipProps {
	/** The x of the hovered point, in pixels from the chart's left edge. */
	readonly x: number
	readonly width: number
	readonly xLabel: string
	readonly rows: readonly TooltipRow[]
}

/**
 * A tooltip beside the crosshair. It sits to the right of the crosshair, or to its left past the
 * middle of the chart, so it stays inside the chart.
 */
export function LineTooltip({ x, width, xLabel, rows }: LineTooltipProps) {
	const flip = x > width / 2
	return (
		<div
			role="presentation"
			className="pointer-events-none absolute top-2 z-10 min-w-40 rounded-md border border-border bg-popover p-2 text-sm text-popover-foreground shadow-sm"
			style={{
				left: x,
				transform: flip ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
			}}
		>
			<p className="font-medium">{xLabel}</p>
			<ul className="mt-1 space-y-0.5">
				{rows.map((row) => (
					<li key={row.name} className="flex items-baseline justify-between gap-3 tabular-nums">
						<span className="text-muted-foreground">{row.name}</span>
						<span>{row.display}</span>
					</li>
				))}
			</ul>
		</div>
	)
}
