<script lang="ts">
import type { ImportPreview } from "../../lib/view/import-values/preview"
import { previewLine, refusedItems } from "../../lib/view/import-values/words"
import ProblemList from "./ProblemList.svelte"

interface Props {
	preview: ImportPreview
	/** Whether there is anything to ask traj about yet. */
	askable: boolean
	/** How many values are being checked. */
	count: number
}

let { preview, askable, count }: Props = $props()
const refused = $derived(preview.state === "refused" ? refusedItems(preview.refusal.values) : null)
</script>

<!-- traj's dry run of the whole batch: what it would record, or every value it refused, each at its row and column. -->
<div class="min-w-0 space-y-3" aria-live="polite">
	{#if preview.state === "running"}
		<p role="status" class="text-sm text-muted-foreground">Checking {count} {count === 1 ? "value" : "values"}…</p>
	{:else if preview.state === "ready"}
		<p role="status" class="text-sm text-foreground">{previewLine(preview.added, preview.unchanged)}</p>
	{:else if preview.state === "refused"}
		{#if refused && refused.shown.length > 0}
			<ProblemList title="traj refused these values. Nothing was written." items={refused.shown} more={refused.more} />
			<p class="text-sm text-muted-foreground">Fix them in the table and go back to Load, or skip the account.</p>
		{/if}
		{#if preview.refusal.general}<p role="alert" class="text-sm text-destructive">{preview.refusal.general}</p>{/if}
	{:else if askable}
		<p class="text-sm text-muted-foreground">Choose the account to count against, and traj checks the values.</p>
	{/if}
</div>
