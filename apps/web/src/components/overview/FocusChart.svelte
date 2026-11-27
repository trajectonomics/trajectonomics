<script lang="ts">
import { screen } from "../../client/media.svelte.js"
import { preferences } from "../../client/preferences.svelte.js"
import { toChartNumber } from "../../lib/chart"
import type { ProjectionRun } from "../../lib/contract"
import { yearOf } from "../../lib/format"
import { axisAge } from "../../lib/view/household/model"
import type { PersonNames } from "../../lib/view/item-names"
import type { FocusView } from "../../lib/view/overview/focus"
import { focusChart } from "../../lib/view/overview/focus-chart"
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
const chart = $derived(focusChart(rows, focus.stopDate, run?.horizon ?? null, width, height))
const firstAge = $derived(
	annual[0] === undefined ? "" : (axisAge(annual[0].ages, people) ?? yearOf(annual[0].to)),
)
const lastRow = $derived(annual.at(-1))
const lastAge = $derived(
	lastRow === undefined ? "" : (axisAge(lastRow.ages, people) ?? yearOf(lastRow.to)),
)
/** On a phone a label with faces is two rows tall, and the room under it keeps it above the bar. */
const room = $derived(
	focus.kind === "runsOut"
		? focus.faces.length > 0 && !screen.medium
			? 86
			: 80
		: focus.faces.length > 0 && !screen.medium
			? 78
			: 58,
)
const labelY = $derived(Math.max(28, Math.min(chart.label?.y ?? height / 2, height - room)))
const unmet = $derived(focus.unmet === null ? "" : shortfallLabel(focus.unmet, preferences.hidden))
</script>

<div bind:clientWidth class="relative w-full">
	<FocusChartSvg {focus} {chart} {width} {height} {unmet} {firstAge} {lastAge} />
	<FocusLabel
		{focus}
		x={chart.label?.x ?? width / 2}
		y={labelY}
		side={chart.label?.side ?? "center"}
	/>
</div>
