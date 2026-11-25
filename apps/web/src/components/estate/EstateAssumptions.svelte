<script lang="ts">
import type { EstateLine, ScenarioDocument } from "../../lib/contract"
import { type AccountNames, nameOf } from "../../lib/view/account-names"
import { NOT_MODELLED_NOTE } from "../../lib/view/estate/notes"
import { lineWords } from "../../lib/view/estate/words"
import Money from "../ui/Money.svelte"

interface Props {
	plan: ScenarioDocument
	/** Said when the plan states no settlement cost: the net estate is everything owned less debts. */
	note: string | null
	names: AccountNames
}

/** The lines the person set, in their own order, and what the page does not work out. */
let { plan, note, names }: Props = $props()
const account = (id: string): string => nameOf(names, id)
const groups: { title: string; lines: readonly EstateLine[] }[] = $derived([
	{ title: "Settlement costs", lines: plan.estate?.costs ?? [] },
	{ title: "Gifts", lines: plan.estate?.gifts ?? [] },
])
</script>

<section aria-label="Your assumptions" class="space-y-3">
	<h3 class="text-base font-semibold">Your assumptions</h3>
	{#each groups as group (group.title)}
		{#if group.lines.length > 0}
			<div>
				<h4 class="text-sm font-medium">{group.title}, in the order they are taken</h4>
				<ul class="mt-1 space-y-1 text-sm">
					{#each group.lines as line (line.id)}
						{@const said = lineWords(line, account)}
						<li><span class="font-medium">{line.id}</span>: {#if said.amount !== null}<Money amount={said.amount} /> {/if}{said.words}</li>
					{/each}
				</ul>
			</div>
		{/if}
	{/each}
	{#if note}<p class="text-sm text-muted-foreground">{note}</p>{/if}
	<p class="text-sm text-muted-foreground">{NOT_MODELLED_NOTE} Each share and amount is your own estimate: none is chosen for you.</p>
</section>
