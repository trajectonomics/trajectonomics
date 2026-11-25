<script lang="ts">
import type { ReachableFi } from "../../lib/view/fi/model"
import Stat from "../ui/Stat.svelte"
import FiReference from "./FiReference.svelte"

interface Props {
	model: ReachableFi
	currency: string
}

/** The reachable answer: the FI month as the main figure, and the reference beneath it. */
let { model, currency }: Props = $props()
</script>

<div class="space-y-8">
	<Stat
		label="Survival method"
		secondary={`The earliest month earned income could stop: ${model.date}`}
	>
		{#snippet value()}{model.month}{/snippet}
	</Stat>
	{#if model.ages !== null}
		<p class="text-sm text-muted-foreground">Ages on that date: {model.ages}.</p>
	{/if}
	<FiReference reference={model.reference} {currency} />
</div>
