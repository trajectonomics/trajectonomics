<script lang="ts">
import Money from "../ui/Money.svelte"

interface Props {
	/** The baseline's text of a field the session changed, or undefined when the session left it alone. */
	was: string | undefined
	/** Whether the text is an amount, which hides with the other amounts. */
	money?: boolean
	currency?: string
}

/** The plan's stored value, struck through beside the value the what-if holds, and named for a screen reader. */
let { was, money = false, currency }: Props = $props()
</script>

{#if was !== undefined}
	<s class="ml-2 text-sm text-muted-foreground"
		><span class="sr-only">Baseline: </span>{#if money}<Money amount={was} {currency} />{:else}{was === "" ? "none" : was}{/if}</s
	>
{/if}
