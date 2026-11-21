export interface LegendItem {
	readonly name: string
	readonly dashed: boolean
	/** The stroke class of the series, so the swatch matches its line. */
	readonly stroke: string
}

export interface LineLegendProps {
	readonly items: readonly LegendItem[]
}

/** The series of a chart, each with a swatch that shows its dash as well as its colour. */
export function LineLegend({ items }: LineLegendProps) {
	return (
		<ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
			{items.map((item) => (
				<li key={item.name} className="flex items-center gap-2">
					<svg width={24} height={8} aria-hidden="true" focusable="false">
						<line
							x1={0}
							x2={24}
							y1={4}
							y2={4}
							strokeWidth={2}
							strokeDasharray={item.dashed ? "6 4" : undefined}
							className={item.stroke}
						/>
					</svg>
					<span>{item.name}</span>
				</li>
			))}
		</ul>
	)
}
