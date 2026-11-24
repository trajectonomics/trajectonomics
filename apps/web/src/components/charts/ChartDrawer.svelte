<script lang="ts">
import type { CatalogueGroup } from "../../lib/view/charts/catalogue"
import type { ChartDef, ChartKind } from "../../lib/view/charts/types"
import Drawer from "../ui/Drawer.svelte"
import ChartForm from "./ChartForm.svelte"

interface Props {
	/** Null when shut; "new" for a new chart; else the chart being edited. */
	open: "new" | ChartDef | null
	groups: readonly CatalogueGroup[]
	names: ReadonlyMap<string, string>
	onSave: (draft: { name: string; kind: ChartKind; series: readonly string[] }) => void
	onClose: () => void
}

let { open, groups, names, onSave, onClose }: Props = $props()
</script>

<!-- The right-side drawer where a chart is made or edited. The form starts afresh each time it opens. -->
<Drawer open={open !== null} title={open === "new" || open === null ? "New chart" : "Edit chart"} {onClose}>
	{#key open === null || open === "new" ? open : open.id}
		{#if open !== null}
			<ChartForm initial={open === "new" ? null : open} {groups} {names} {onSave} onCancel={onClose} />
		{/if}
	{/key}
</Drawer>
