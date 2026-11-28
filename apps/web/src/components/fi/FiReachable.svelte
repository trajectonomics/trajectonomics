<script lang="ts">
import type { ReachableFi } from "../../lib/view/fi/model"
import Stat from "../ui/Stat.svelte"
import FiReference from "./FiReference.svelte"

interface Props {
	model: ReachableFi
	currency: string
	/** The plan's chart above already carries the month, so the date line and ages move into the page's hidden text. */
	lead?: boolean
}

/** The reachable answer: the FI month as the main figure, and the reference beneath it. */
let { model, currency, lead = false }: Props = $props()
const dateLine = $derived(`The earliest month earned income could stop: ${model.date}`)
</script>

<div class="space-y-8">
	{#if lead}
		<p class="sr-only">{dateLine}</p>
	{:else}
		<Stat label="FI date" secondary={dateLine}>
			{#snippet value()}{model.month}{/snippet}
		</Stat>
	{/if}
	{#if model.ages !== null}
		<p class={lead ? "sr-only" : "text-sm text-muted-foreground"}>Ages on that date: {model.ages}.</p>
	{/if}
	<FiReference reference={model.reference} {currency} />
</div>
