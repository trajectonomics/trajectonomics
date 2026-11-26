<script lang="ts">
import type { Part } from "../../lib/view/routing/words"
import ItemWords from "../ui/ItemWords.svelte"
import Money from "../ui/Money.svelte"

interface Props {
	parts: readonly Part[]
	/** The plan's currency code, shown beside each amount. */
	currency: string
}

let { parts, currency }: Props = $props()
</script>

<!-- A row's sentence: its words, each amount drawn as `Money`, and an item's label or the id in code. -->
<span>
	{#each parts as part, index (index)}{#if typeof part === "string"}{part}{:else if "amount" in part}<Money amount={part.amount} {currency} />{:else}<ItemWords label={part.item} />{/if}{/each}
</span>
