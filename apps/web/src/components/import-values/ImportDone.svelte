<script lang="ts">
import { importSession as session } from "../../client/import-values.svelte.js"
import type { ImportPlan } from "../../lib/view/import-values/plan"
import { doneLine } from "../../lib/view/import-values/words"
import { BUTTON } from "./styles"

interface Props {
	plan: ImportPlan
}

let { plan }: Props = $props()
const saved = $derived(session.saved)
</script>

<!-- What traj recorded, in its own counts, then Done. The history chart behind the drawer now reads the new Snapshot. -->
<div class="min-w-0 space-y-6">
	{#if saved}
		<p role="status" class="text-sm text-foreground">{doneLine(saved.counts.added, saved.counts.unchanged, plan.earliest, plan.latest)}</p>
	{/if}
	<button type="button" onclick={() => session.cancel()} class={BUTTON}>Done</button>
</div>
