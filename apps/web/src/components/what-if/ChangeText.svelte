<script lang="ts">
import type { ChangeView } from "../../lib/view/what-if/change"
import Money from "../ui/Money.svelte"

interface Props {
	change: ChangeView
}

/** The change the CLI stated, with a sign and words, so it never relies on colour. A change the CLI did not state says
 * so, with its reason in view, so it never reads as "nothing changed". */
let { change }: Props = $props()
</script>

{#if change.kind === "none"}
	<span class="text-muted-foreground"
		>No change figure<span class="sr-only">. </span><span class="block max-w-64 text-xs">{change.reason}</span></span
	>
{:else if change.kind === "same"}
	<span>No change</span>
{:else if change.kind === "count"}
	<span class="whitespace-nowrap">{change.text}, {change.words}</span>
{:else}
	<span class="whitespace-nowrap"
		>{change.amount.startsWith("-") ? "" : "+"}<Money amount={change.amount} />, {change.words}</span
	>
{/if}
