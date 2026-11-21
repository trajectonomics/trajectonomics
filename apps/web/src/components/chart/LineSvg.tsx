import type { LineLayout } from "../../lib/chart"
import { abbreviate, maskMoney } from "../../lib/format"
import { HEIGHT, MARGIN } from "./geometry"
import { LineMarks } from "./LineMarks"
import { dashPattern, strokeClass } from "./series-style"

export interface LineSvgProps {
	readonly label: string
	readonly layout: LineLayout
	readonly width: number
	/** Whether the y labels are money and hidden. */
	readonly masked: boolean
	/** The hovered index, or null. */
	readonly index: number | null
}

/** The chart drawn as one SVG: the grid, the axis labels, every series and the hover marks. */
export function LineSvg({ label, layout, width, masked, index }: LineSvgProps) {
	return (
		<svg
			role="img"
			aria-label={label}
			width={width}
			height={HEIGHT}
			viewBox={`0 0 ${width} ${HEIGHT}`}
			className="block h-auto w-full"
		>
			{layout.yTicks.map((tick) => (
				<g key={tick.value}>
					<line
						x1={MARGIN.left}
						x2={width - MARGIN.right}
						y1={tick.y}
						y2={tick.y}
						className="stroke-border"
					/>
					<text
						x={MARGIN.left - 8}
						y={tick.y}
						textAnchor="end"
						dominantBaseline="middle"
						className="fill-muted-foreground text-xs tabular-nums"
					>
						{masked ? maskMoney(abbreviate(tick.value)) : abbreviate(tick.value)}
					</text>
				</g>
			))}
			{layout.xTicks.map((tick) => (
				<text
					key={tick.index}
					x={layout.xPixels[tick.index]}
					y={HEIGHT - 8}
					textAnchor="middle"
					className="fill-muted-foreground text-xs"
				>
					{tick.label}
				</text>
			))}
			{layout.series.map((line, seriesIndex) => (
				<path
					key={line.name}
					d={line.path}
					fill="none"
					strokeWidth={2}
					strokeLinejoin="round"
					strokeLinecap="round"
					strokeDasharray={dashPattern(line.dashed)}
					className={strokeClass(seriesIndex)}
				/>
			))}
			{index !== null && <LineMarks layout={layout} index={index} />}
		</svg>
	)
}
