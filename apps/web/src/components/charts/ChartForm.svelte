<script lang="ts">
import type { CatalogueGroup } from "../../lib/view/charts/catalogue"
import { defaultName } from "../../lib/view/charts/edit"
import {
	CHART_KINDS,
	type ChartDef,
	type ChartKind,
	KIND_LABELS,
	MAX_NAME,
} from "../../lib/view/charts/types"
import Field from "../plan-items/Field.svelte"
import SeriesPicker from "./SeriesPicker.svelte"

interface Props {
	/** The chart being edited, or null for a new one. */
	initial: ChartDef | null
	groups: readonly CatalogueGroup[]
	names: ReadonlyMap<string, string>
	/** Saves the chart: its name (empty for the default), kind and series. */
	onSave: (draft: { name: string; kind: ChartKind; series: readonly string[] }) => void
	onCancel: () => void
}

let { initial, groups, names, onSave, onCancel }: Props = $props()
// The form starts from the chart it is opened on and is made afresh each time (a keyed block in the drawer).
// svelte-ignore state_referenced_locally
let name = $state(initial?.name ?? "")
// svelte-ignore state_referenced_locally
let kind = $state<string>(initial?.kind ?? "line")
// svelte-ignore state_referenced_locally
let series = $state<readonly string[]>(initial?.series ?? [])
const kinds = CHART_KINDS.map((value) => ({ value, label: KIND_LABELS[value] }))
const label = (id: string) => names.get(id) ?? id

function toggle(id: string): void {
	series = series.includes(id) ? series.filter((item) => item !== id) : [...series, id]
}
</script>

<form
	class="space-y-5"
	onsubmit={(event) => {
		event.preventDefault()
		onSave({
			name: name.trim() || defaultName(series.map(label)),
			kind: CHART_KINDS.find((value) => value === kind) ?? "line",
			series,
		})
	}}
>
	<Field id="chart-name" label="Name" bind:value={name} hint="Optional, up to {MAX_NAME} characters. Left empty, it is named after its series." />
	<Field id="chart-kind" label="Kind" bind:value={kind} options={kinds} />
	<SeriesPicker {groups} chosen={series} {names} onToggle={toggle} />
	<div class="flex gap-2">
		<button type="submit" disabled={series.length === 0} class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground outline-none focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">
			{initial ? "Save chart" : "Create chart"}
		</button>
		<button type="button" onclick={onCancel} class="rounded-md border border-border px-4 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-ring">Cancel</button>
	</div>
</form>
