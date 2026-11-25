<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import type { PlanDrawer } from "../../lib/view/plan-items/drawer"
import type { PlanKind } from "../../lib/view/plan-items/kinds"

interface Props {
	kind: PlanKind
	/** The noun of the page's item, which the first button adds. */
	noun: string
	/** Opens the planner's drawer on a new item, in the form it names. */
	open: (drawer: PlanDrawer) => void
}

let { kind, noun, open }: Props = $props()
const busy = $derived(editSession.busy)
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
</script>

<div class="flex flex-wrap gap-2">
	<button type="button" onclick={() => open({})} disabled={busy} class={button}>Add {noun}</button>
	{#if kind === "assets"}
		<button type="button" onclick={() => open({ asset: true })} disabled={busy} class={button}>Add a home or car</button>
		<button type="button" onclick={() => open({ loan: true })} disabled={busy} class={button}>Add loan</button>
	{/if}
</div>
