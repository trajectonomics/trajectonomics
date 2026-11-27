<script lang="ts">
import { printPage, saveFile } from "../../client/download.js"
import type { ReportFile } from "../../lib/view/reports/files"

type Build = () => ReportFile

interface Props {
	/** Each file is built when its button is pressed, so a long run is not serialised on every change. */
	csv: Build | null
	json: Build | null
	all: Build
	/** Whether a field is shown: with none, the CSV would hold nothing, so its button is off. */
	csvReady: boolean
}

let { csv, json, all, csvReady }: Props = $props()
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
</script>

<div class="print:hidden space-y-2">
	<div class="flex flex-wrap gap-2">
		{#if csv !== null}
			<button type="button" class={button} disabled={!csvReady} onclick={() => saveFile(csv())}>Download CSV</button>
		{/if}
		{#if json !== null}
			<button type="button" class={button} onclick={() => saveFile(json())}>Download JSON</button>
		{/if}
		<button type="button" class={button} onclick={() => saveFile(all())}>Download everything</button>
		<button type="button" class={button} onclick={printPage}>Print</button>
		<p class="self-center text-xs text-muted-foreground">
			A landscape page fits about 15 fields. Hide fields to print each figure whole, or use the CSV.
		</p>
	</div>
	<p class="max-w-prose text-xs text-muted-foreground">
		An empty CSV cell means traj stated null for that figure, as the JSON shows. The JSON holds the same values
		as these figures do, though not their exact text: the Dashboard keeps the parsed result, so spacing may differ.
	</p>
</div>
