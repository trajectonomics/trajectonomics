import { sparklinePath } from "../../lib/chart"

export interface SparklineProps {
	/** What the line stands for, read out by a screen reader, such as "Net worth, last 24 months". */
	readonly label: string
	/** The values in order, as numbers. A sparkline shows only the shape, never a figure. */
	readonly values: readonly number[]
}

const WIDTH = 120
const HEIGHT = 32

/** A line with no axes, for the shape of a series at a glance. Its colour is the brand foreground. */
export function Sparkline({ label, values }: SparklineProps) {
	return (
		<svg
			role="img"
			aria-label={label}
			viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
			preserveAspectRatio="none"
			className="block h-10 w-full overflow-visible"
		>
			<path
				d={sparklinePath(values, WIDTH, HEIGHT)}
				fill="none"
				strokeWidth={2}
				strokeLinejoin="round"
				strokeLinecap="round"
				vectorEffect="non-scaling-stroke"
				className="stroke-foreground"
			/>
		</svg>
	)
}
