<script lang="ts">
import { screen } from "../../client/media.svelte.js"
import { preferences } from "../../client/preferences.svelte.js"
import { toChartNumber } from "../../lib/chart"
import type { ProjectionRun } from "../../lib/contract"
import { yearOf } from "../../lib/format"
import { axisAge } from "../../lib/view/household/model"
import type { PersonNames } from "../../lib/view/item-names"
import type { FocusView } from "../../lib/view/overview/focus"
import type { LabelBox } from "../../lib/view/overview/focus-label-layout"
import { focusLayout } from "../../lib/view/overview/focus-layout"
import { shortfallLabel } from "../../lib/view/overview/focus-words"
import { annualRowsOf } from "../../lib/view/projection/annual"
import FocusChartSvg from "./FocusChartSvg.svelte"
import FocusLabel from "./FocusLabel.svelte"

interface Props {
	focus: FocusView
	run: ProjectionRun | null
	people: PersonNames
}

/** The focus point's one chart: the closing net worth by year, the stop point and the answer written on it. */
let { focus, run, people }: Props = $props()
let clientWidth = $state(0)
const width = $derived(clientWidth > 0 ? Math.floor(clientWidth) : 640)
const height = $derived(screen.medium ? 300 : 230)
const annual = $derived(focus.kind === "setup" || run === null ? [] : annualRowsOf(run))
const rows = $derived(annual.map((row) => ({ to: row.to, y: toChartNumber(row.closingNetWorth) })))
const firstAge = $derived(
	annual[0] === undefined ? "" : (axisAge(annual[0].ages, people) ?? yearOf(annual[0].to)),
)
const lastRow = $derived(annual.at(-1))
const lastAge = $derived(
	lastRow === undefined ? "" : (axisAge(lastRow.ages, people) ?? yearOf(lastRow.to)),
)
/** The box the label draws before its own text is measured; a phone stacks the faces under the answer. */
const fallback = $derived<LabelBox>({ width: 220, height: screen.medium ? 48 : 72 })
let measured = $state<LabelBox>({ width: 0, height: 0 })
const box = $derived(measured.width > 0 && measured.height > 0 ? measured : fallback)
const layout = $derived(
	focusLayout(
		rows,
		focus.stopDate,
		run?.horizon ?? null,
		width,
		height,
		box,
		focus.kind === "reachable",
	),
)
const unmet = $derived(focus.unmet === null ? "" : shortfallLabel(focus.unmet, preferences.hidden))
function measuredBy(next: LabelBox): void {
	measured = next
}
</script>

<div bind:clientWidth class="relative w-full">
	<FocusChartSvg
		{focus}
		chart={layout.chart}
		{width}
		height={layout.height}
		flagBox={layout.flag}
		{unmet}
		{firstAge}
		{lastAge}
	/>
	<FocusLabel {focus} x={layout.label.x} y={layout.label.y} onmeasure={measuredBy} />
</div>