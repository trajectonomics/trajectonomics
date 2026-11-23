<script lang="ts">
import { type EstateDraft, emptyLine, type ListName, moveLine } from "../../lib/view/estate/draft"
import type { AccountChoice } from "../../lib/view/estate/options"
import type { Shown } from "../../lib/view/plan-items/problems"
import LineEditor from "./LineEditor.svelte"

interface Props {
	draft: EstateDraft
	list: ListName
	accounts: readonly AccountChoice[]
	shown: Shown
}

/** The costs, or the gifts, in the order they are taken, each with its fields and an "Add" at the end. */
let { draft = $bindable(), list, accounts, shown }: Props = $props()
const costs = $derived(list === "costs")
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
</script>

<section aria-label={costs ? "Settlement costs" : "Gifts"} class="space-y-3">
	<h3 class="text-sm font-semibold">{costs ? "Settlement costs" : "Gifts"}</h3>
	<p class="text-xs text-muted-foreground">
		{costs ? "What settling the estate costs, such as court and lawyer fees, a transfer fee or an inheritance tax, in the order taken." : "What is given from the net estate to a temple, a charity or a named person. A later gift takes only what earlier ones left."}
	</p>
	{#each draft[list] as line, index (index)}
		<LineEditor
			bind:line={() => line, (value) => (draft[list][index] = value)}
			{list}
			{index}
			count={draft[list].length}
			{accounts}
			{shown}
			onMove={(by) => (draft = moveLine(draft, list, index, by))}
			onRemove={() => draft[list].splice(index, 1)}
		/>
	{/each}
	<button type="button" class={button} onclick={() => draft[list].push(emptyLine())}>{costs ? "Add a cost" : "Add a gift"}</button>
</section>
