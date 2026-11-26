import type { LabelArea, LabelledMark, PlacedLabel } from "./label-rows"

/** A chart's area as `LineRules.svelte` passes it for a line chart: 64px of axis labels, 16px on the right. */
export function chartArea(width: number): LabelArea {
	return { width, left: 64, right: width - 16 }
}

/** An area with no margins, for a test of rows and words alone. */
export function bareArea(width: number): LabelArea {
	return { width, left: 0, right: width }
}

/** The pixels a drawn label covers, worked out here for labels of narrow ASCII letters only. */
export function boxOf(mark: LabelledMark, label: PlacedLabel): { from: number; to: number } {
	const ellipsis = mark.code === true ? 7 : 12
	const cell = mark.code === true ? 7 : 7.5
	const cut = label.text.endsWith("…")
	const width = cut ? (label.text.length - 1) * cell + ellipsis : label.text.length * cell
	return label.leftwards
		? { from: mark.x - 4 - width, to: mark.x - 4 }
		: { from: mark.x + 4, to: mark.x + 4 + width }
}

/** What is wrong with the drawn labels: one that leaves the plot, covers a rule, or overlaps its row. */
export function faults(
	marks: readonly LabelledMark[],
	placed: readonly PlacedLabel[],
	area: LabelArea,
): string[] {
	const drawn = marks.flatMap((mark, index) => {
		const label = placed[index]
		return label === undefined || label.text === ""
			? []
			: [{ text: `${label.text} at ${mark.x}`, row: label.row, ...boxOf(mark, label) }]
	})
	return drawn.flatMap((box, index) => [
		...(box.from < area.left || box.to > area.right ? [`${box.text} leaves the plot`] : []),
		...marks
			.filter((mark) => mark.x > box.from && mark.x < box.to)
			.map((mark) => `${box.text} covers the rule at ${mark.x}`),
		...drawn
			.slice(index + 1)
			.filter((other) => other.row === box.row && other.from < box.to && box.from < other.to)
			.map((other) => `${box.text} overlaps ${other.text}`),
	])
}

/** Three rules anywhere in an area's plot: apart, touching and on its edges, each with a long label. */
export function threeRules(area: LabelArea): LabelledMark[][] {
	const steps = (from: number, by: number) =>
		Array.from({ length: Math.floor((area.right - from) / by) + 1 }, (_, i) => from + i * by)
	return steps(area.left, 7).flatMap((first) =>
		steps(first, 5).flatMap((second) =>
			[0, 3, 11, 40].map((gap) =>
				[first, second, Math.min(area.right, second + gap)].map((x) => ({
					x,
					label: "abcdefghij",
				})),
			),
		),
	)
}
