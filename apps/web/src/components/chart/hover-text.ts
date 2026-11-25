import type { LineLayout } from "../../lib/chart"
import { maskMoney } from "../../lib/format"
import { strokeClass } from "./series-style"
import type { TooltipRow } from "./types"

/** The string a tooltip row shows: the CLI's figure, masked when hidden, or a note for no value. */
export function displayOf(display: string | undefined, masked: boolean): string {
	if (display === undefined) return "no value"
	return masked ? maskMoney(display) : display
}

/** What a screen reader hears for the hovered x: its label, then each series' string. */
export function describeIndex(layout: LineLayout, index: number, masked: boolean): string {
	const parts = layout.series.map((line) => {
		const mark = line.marks[index]
		return `${line.name} ${displayOf(mark?.display, masked && !line.plain)}`
	})
	return [layout.xTitles?.[index] ?? layout.xLabels[index] ?? "", ...parts].join(", ")
}

/** The rows of the tooltip at an index: each series' name, its string and its stroke. */
export function tooltipRows(layout: LineLayout, index: number, masked: boolean): TooltipRow[] {
	return layout.series.map((line, seriesIndex) => ({
		name: line.name,
		display: displayOf(line.marks[index]?.display, masked && !line.plain),
		stroke: strokeClass(seriesIndex, layout.palette === "wide"),
	}))
}
