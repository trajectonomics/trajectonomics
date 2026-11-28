<script lang="ts">
import { currentHash, currentSearch } from "../../client/location.svelte.js"
import type { Snapshot } from "../../lib/contract"
import { keepShown } from "../../lib/edit/shown"
import { planAssumed } from "../../lib/view/assumed/snapshot"
import AssumedGroup from "./AssumedGroup.svelte"

interface Props {
	snapshot: Snapshot
	/** The plan the page shows. The list is the saved plan's, with or without a what-if open. */
	plan: string | null
	/** Whether the Edit controls show, which a Keep is one of. */
	editable: boolean
}

let { snapshot, plan, editable }: Props = $props()
const view = $derived(planAssumed(snapshot, plan, currentSearch()))
const keeper = $derived(
	editable && keepShown() && plan !== null && view ? { plan, contentHash: view.contentHash } : null,
)
let box: HTMLElement | undefined = $state()

// Home's card links here by fragment, and the browser looks for it before the figures have drawn it.
$effect(() => {
	if (currentHash() === "assumed") box?.scrollIntoView()
})
</script>

{#if view}
	<section bind:this={box} id="assumed" aria-labelledby="assumed-title" class="scroll-mt-24">
		<h2 id="assumed-title" class="text-base font-semibold">This plan assumes</h2>
		<div class="divide-y divide-border">
			{#each view.groups as group (group.key)}
				<AssumedGroup {group} {keeper} />
			{/each}
		</div>
	</section>
{/if}
