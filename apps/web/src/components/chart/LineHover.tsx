import type { Dispatch, KeyboardEvent, PointerEvent, SetStateAction } from "react"
import { keyTarget, type LineLayout, nearestIndex } from "../../lib/chart"
import { maskMoney } from "../../lib/format"
import { LineSvg } from "./LineSvg"
import { LineTooltip } from "./LineTooltip"
import { strokeClass } from "./series-style"

export interface LineHoverProps {
	readonly label: string
	readonly layout: LineLayout
	readonly width: number
	readonly masked: boolean
	/** The hovered or focused index into the layout's x positions, or null for none. */
	readonly active: number | null
	readonly onActive: Dispatch<SetStateAction<number | null>>
}

/**
 * The chart's focusable surface. A pointer picks the nearest x; the keyboard steps through them, and
 * focus starts at the latest. Leaving it, or blurring it, clears the hover.
 */
export function LineHover({ label, layout, width, masked, active, onActive }: LineHoverProps) {
	const count = layout.xPixels.length
	const index = active !== null && active < count ? active : null

	const valueText = index === null ? "No point selected" : describeIndex(layout, index, masked)

	function onPointerMove(event: PointerEvent<HTMLDivElement>): void {
		const left = event.currentTarget.getBoundingClientRect().left
		onActive(nearestIndex(layout.xPixels, event.clientX - left))
	}

	function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
		const next = keyTarget(event.key, index ?? count - 1, count)
		if (next === null) return
		event.preventDefault()
		onActive(next)
	}

	return (
		<div
			role="slider"
			aria-label={label}
			aria-valuemin={0}
			aria-valuemax={count - 1}
			aria-valuenow={index ?? count - 1}
			aria-valuetext={valueText}
			tabIndex={0}
			onPointerMove={onPointerMove}
			onPointerLeave={() => onActive(null)}
			onFocus={() => onActive(count - 1)}
			onBlur={() => onActive(null)}
			onKeyDown={onKeyDown}
			className="relative rounded-md outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
		>
			<LineSvg label={label} layout={layout} width={width} masked={masked} index={index} />
			{index !== null && (
				<LineTooltip
					x={layout.xPixels[index] ?? 0}
					width={width}
					xLabel={layout.xLabels[index] ?? ""}
					rows={layout.series.map((line, seriesIndex) => {
						const mark = line.marks[index]
						return {
							name: line.name,
							display: displayOf(mark?.display, masked),
							stroke: strokeClass(seriesIndex),
						}
					})}
				/>
			)}
		</div>
	)
}

/** The string a tooltip row shows: the CLI's figure, masked when hidden, or a note for no value. */
function displayOf(display: string | undefined, masked: boolean): string {
	if (display === undefined) return "no value"
	return masked ? maskMoney(display) : display
}

/** What a screen reader hears for the hovered x: its label, then each series' string. */
function describeIndex(layout: LineLayout, index: number, masked: boolean): string {
	const parts = layout.series.map((line) => {
		const mark = line.marks[index]
		return `${line.name} ${displayOf(mark?.display, masked)}`
	})
	return [layout.xLabels[index] ?? "", ...parts].join(", ")
}
