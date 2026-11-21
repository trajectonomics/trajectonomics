import type { LineLayout } from "../../lib/chart"
import { HEIGHT, MARGIN } from "./geometry"
import { strokeClass } from "./series-style"

export interface LineMarksProps {
	readonly layout: LineLayout
	/** The index of the hovered x. */
	readonly index: number
}

/** The crosshair at the hovered x, and a dot on each series that has a value there. */
export function LineMarks({ layout, index }: LineMarksProps) {
	const x = layout.xPixels[index]
	if (x === undefined) return null
	return (
		<g>
			<line
				x1={x}
				x2={x}
				y1={MARGIN.top}
				y2={HEIGHT - MARGIN.bottom}
				strokeDasharray="2 3"
				className="stroke-muted-foreground"
			/>
			{layout.series.map((line, seriesIndex) => {
				const mark = line.marks[index]
				if (!mark) return null
				return (
					<circle
						key={line.name}
						cx={mark.x}
						cy={mark.y}
						r={4}
						strokeWidth={2}
						className={`fill-background ${strokeClass(seriesIndex)}`}
					/>
				)
			})}
		</g>
	)
}
