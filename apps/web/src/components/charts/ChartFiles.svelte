<script lang="ts">
interface Props {
	hasCharts: boolean
	onExport: () => void
	onImport: (file: File) => void
}

let { hasCharts, onExport, onImport }: Props = $props()
const BUTTON =
	"rounded-md border border-border px-3 py-1.5 text-sm outline-none hover:bg-muted focus-within:outline-2 focus-within:outline-ring"

function picked(event: Event & { currentTarget: HTMLInputElement }): void {
	const file = event.currentTarget.files?.[0]
	if (file) onImport(file)
	event.currentTarget.value = ""
}
</script>

<!-- Chart definitions move between browsers as a small JSON file. It holds names and series ids, no figure. -->
<div class="flex flex-wrap gap-2 print:hidden">
	{#if hasCharts}
		<button type="button" class={BUTTON} onclick={onExport}>Export my charts</button>
	{/if}
	<label class="{BUTTON} cursor-pointer">
		Import charts
		<input type="file" accept="application/json,.json" class="sr-only" onchange={picked} />
	</label>
</div>
