<script lang="ts">
import { printPage, saveFile } from "../../client/download.js"
import type { ReportFile } from "../../lib/view/reports/files"

interface Props {
	/** Each file is built when its button is pressed, so a long run is not serialised on every change. */
	csv: () => ReportFile
	json: () => ReportFile
	all: () => ReportFile
}

let { csv, json, all }: Props = $props()
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
</script>

<div class="print:hidden flex flex-wrap gap-2">
	<button type="button" class={button} onclick={() => saveFile(csv())}>Download CSV</button>
	<button type="button" class={button} onclick={() => saveFile(json())}>Download JSON</button>
	<button type="button" class={button} onclick={() => saveFile(all())}>Download everything</button>
	<button type="button" class={button} onclick={printPage}>Print</button>
</div>
