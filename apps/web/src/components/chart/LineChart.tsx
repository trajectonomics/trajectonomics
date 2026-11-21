import { useState } from "react"
import { useHideAmounts } from "../../client/preferences-store"
import { type LineSeries, lineLayout } from "../../lib/chart"
import { EmptyState } from "../ui/EmptyState"
import { HEIGHT, MARGIN } from "./geometry"
import { LineHover } from "./LineHover"
import { LineLegend } from "./LineLegend"
import { strokeClass } from "./series-style"
import { useMeasuredWidth } from "./use-measured-width"

export interface LineChartProps {
	/** What the chart shows, read out by a screen reader, such as "Net worth by month". */
	readonly label: string
	readonly series: readonly LineSeries[]
	/** Whether the values are money. Money hides under the hide-amounts switch; other values do not. */
	readonly money?: boolean
	/** Overrides the hide-amounts switch. Left out, the switch decides. */
	readonly hidden?: boolean
}

/**
 * A line chart. Hover, and the arrow keys once it has focus, show a crosshair and a tooltip with
 * every series' string. Its axis labels are the CLI's figures, abbreviated, and hide with them.
 */
export function LineChart({ label, series, money = true, hidden }: LineChartProps) {
	const [ref, width] = useMeasuredWidth(640)
	const [active, setActive] = useState<number | null>(null)
	const [switchHidden] = useHideAmounts()
	const masked = (hidden ?? switchHidden) && money
	const layout = lineLayout(series, { width, height: HEIGHT, margin: MARGIN })
	return (
		<div ref={ref} className="w-full">
			{layout ? (
				<LineHover
					label={label}
					layout={layout}
					width={width}
					masked={masked}
					active={active}
					onActive={setActive}
				/>
			) : (
				<EmptyState title="Nothing to chart yet" />
			)}
			{layout && series.length > 1 && <LineLegend items={legendItems(series)} />}
		</div>
	)
}

/** The legend's rows: each series' name, whether it is dashed, and its stroke. */
function legendItems(series: readonly LineSeries[]) {
	return series.map((line, index) => ({
		name: line.name,
		dashed: line.dashed ?? false,
		stroke: strokeClass(index),
	}))
}
