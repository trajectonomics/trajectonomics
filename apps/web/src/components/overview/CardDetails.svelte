<script lang="ts">
import type { CardFigure } from "../../lib/view/overview/card-details"
import Fact from "../projection/Fact.svelte"
import Money from "../ui/Money.svelte"

interface Props {
	/** Each figure's exact CLI string, which Hide amounts masks when it is money. */
	figures?: readonly CardFigure[]
	/** The CLI's notes for this card. */
	notes?: readonly string[]
}

/** The exact figures and the CLI's notes a summary card keeps in its Details, never on its face. */
let { figures = [], notes = [] }: Props = $props()
</script>

{#if figures.length > 0 || notes.length > 0}
	<dl class="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
		{#each figures as figure (figure.key ?? figure.label)}
			<Fact label={figure.label}>
				{#if figure.money}
					<Money amount={figure.value} currency={figure.currency} />
				{:else}
					<span class="tabular-nums">{figure.value}</span>
				{/if}
			</Fact>
		{/each}
		{#each notes as note, index (index)}
			<Fact label={notes.length === 1 ? "Note" : `Note ${index + 1}`}
				><span data-cli>{note}</span></Fact
			>
		{/each}
	</dl>
{/if}
