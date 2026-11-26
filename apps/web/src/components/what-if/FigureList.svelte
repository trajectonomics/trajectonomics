<script lang="ts">
import type { Triple } from "../../lib/view/what-if/triple"
import ItemWords from "../ui/ItemWords.svelte"
import FigureTriple from "./FigureTriple.svelte"

interface Props {
	triples: readonly Triple[]
}

/** A list of figures, each with its what-if value, its baseline and its change: one column on a phone, two above. */
let { triples }: Props = $props()
</script>

<dl class="grid gap-x-8 gap-y-5 sm:grid-cols-2">
	{#each triples as triple (triple.key)}
		<div>
			<dt class="wrap-anywhere text-sm text-muted-foreground">{#if triple.labelItem !== undefined}<ItemWords label={triple.labelItem} />{:else}{triple.label}{/if}</dt>
			<dd class="mt-1"><FigureTriple {triple} large /></dd>
		</div>
	{/each}
</dl>
