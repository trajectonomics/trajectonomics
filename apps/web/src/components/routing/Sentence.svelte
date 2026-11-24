<script lang="ts">
import type { Part } from "../../lib/view/routing/words"
import Money from "../ui/Money.svelte"

interface Props {
	parts: readonly Part[]
	/** The plan's currency code, shown beside each amount. */
	currency: string
}

let { parts, currency }: Props = $props()
</script>

<!-- A row's sentence: its words, and each amount drawn as `Money` so the hide-amounts switch masks it. -->
<span>
	{#each parts as part, index (index)}{#if typeof part === "string"}{part}{:else}<Money amount={part.amount} {currency} />{/if}{/each}
</span>
